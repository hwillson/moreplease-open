import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { moment } from 'meteor/momentjs:moment';
import { FlowRouter } from 'meteor/kadira:flow-router';
import swal from 'sweetalert';

import {
  StoresCollection,
  SubscriptionsCollection,
  SubscriptionStatus,
  SubscriptionItemsCollection,
  price,
  date,
} from 'meteor/moreplease:common';
import './subscription_orders';

import './subscription.html';

const getStore = () => StoresCollection.findOne();
const getCurrentSubscription = () => SubscriptionsCollection.findOne();

Template.adminSubscription.onCreated(function onCreated() {
  this.subscribe('store');
  const subscriptionId = Session.get('subscriptionId');
  this.subscribe('subscriptionAnyStatus', subscriptionId, {
    onReady: _.bind(function onReady() {
      const subscription = SubscriptionsCollection.findOne();
      this.subscribe('singleCustomer', subscription.customerId);
    }, this),
  });
  this.subscribe('subscriptionItems', subscriptionId);
  this.subscribe('productsForSubscription', subscriptionId);
});

Template.adminSubscription.onRendered(function onRendered() {
  this.autorun(() => {
    if (Template.instance().subscriptionsReady()) {
      const subscription = SubscriptionsCollection.findOne();
      if (subscription) {
        if ((subscription.statusId === SubscriptionStatus.paused.id)
            || (subscription.statusId === SubscriptionStatus.failed.id)) {
          Meteor.defer(() => {
            $('.subscription-pause').hide();
            $('.subscription-resume').show();
          });
        } else if (subscription.statusId === SubscriptionStatus.cancelled.id) {
          Meteor.defer(() => {
            $('.subscription-controls').hide();
          });
        }
      }

      Meteor.defer(() => {
        $('.subscription-renewal-date').datepicker({
          format: getStore().getDatePickerFormat(),
          autoclose: true,
          startDate: moment().add(1, 'days').format(getStore().getDateFormat()),
        });
      });

      Meteor.defer(() => {
        $('.subscription-renewal-freq').val(subscription.renewalFrequencyId);
      });
    }
  });
});

Template.adminSubscription.helpers({
  subscription() {
    return getCurrentSubscription();
  },

  subscriptionCurrency() {
    const subscription = getCurrentSubscription();
    return subscription.currency;
  },

  subscriptionStatusLabel() {
    return SubscriptionStatus[this.statusId].label;
  },

  subscriptionItemsExist() {
    let subscriptionItemsCount = 0;
    const subscription = getCurrentSubscription();
    if (subscription) {
      subscriptionItemsCount = SubscriptionItemsCollection.find().count();
    }
    return subscriptionItemsCount;
  },

  subscriptionItems() {
    return SubscriptionItemsCollection.find();
  },

  subscriptionItemPrice(subscriptionItem) {
    const currency = getCurrentSubscription().currency;
    return price.formatPrice(
      subscriptionItem.totalCurrentPrice(currency),
      currency,
    );
  },

  customerUrl() {
    return getStore().customerDetailsUrl + this.getCustomer().externalId;
  },

  customerOrdersUrl() {
    return getStore().customerOrdersUrl + this.getCustomer().externalId;
  },

  paymentFailed() {
    let paymentFailed = false;
    const subscription = getCurrentSubscription();
    if (subscription.statusId === SubscriptionStatus.failed.id) {
      paymentFailed = true;
    }
    return paymentFailed;
  },

  availableRenewalFrequencies() {
    return getStore().availableRenewalFrequencies;
  },

  store() {
    return getStore();
  },

  imageUrl(image) {
    let imageUrl;
    if (image) {
      if (image.indexOf('http') === 0) {
        imageUrl = image;
      } else {
        imageUrl = `${getStore().url}${image}`;
      }
    }
    return imageUrl;
  },
});

Template.adminSubscription.events({

  'click .goto-subscriptions'(event) {
    event.preventDefault();
    FlowRouter.go('/subscriptions');
  },

  'click .subscription-pause'(event) {
    event.preventDefault();
    this.updateSubscriptionStatus(SubscriptionStatus.paused.id);
    $('.subscription-pause').hide();
    $('.subscription-resume').show();
  },

  'click .subscription-resume'(event) {
    event.preventDefault();
    this.updateSubscriptionStatus(SubscriptionStatus.active.id);
    $('.subscription-resume').hide();
    $('.subscription-pause').show();
  },

  'click .subscription-cancel'(event) {
    event.preventDefault();
    this.cancelSubscription();
    $('.subscription-controls').hide();
  },

  'change .subscription-renewal-date': _.debounce(function changeRenewalDate(e) {
    const selectedDate = $(e.currentTarget).val();
    if (selectedDate) {
      this.updateRenewalDate(selectedDate, getStore().dateFormat);
    } else {
      $(e.currentTarget).val(
        date.formatDate(this.renewalDate, getStore().getDateFormat()),
      );
    }
  }, 100),

  'change .subscription-renewal-freq'(event) {
    const frequencyId = $(event.currentTarget).find(':selected').val();
    this.updateRenewalFrequency(frequencyId);
  },

  'click .subscription-renew-now'(event) {
    event.preventDefault();
    swal({
      title: 'Renew Subscription Immediately?',
      text: 'This will immediately create a new renewal order (and bill the customer). Are you sure?',
      icon: 'warning',
      buttons: {
        cancel: {
          text: 'Cancel',
          visible: true,
          value: false,
        },
        confirm: {
          text: 'Renew Now',
          closeModal: true,
          value: true,
        },
      },
      dangerMode: true,
    }).then((confirmed) => {
      if (confirmed) {
        $('.confirm').html('Renewing...');
        Meteor.call(
          'createSubscriptionRenewal',
          this._id,
          (error, renewedSuccessfuly) => {
            if (renewedSuccessfuly) {
              swal('Renewal order has been created.');
            } else {
              swal('Renewal order has not been created.');
            }
          },
        );
      }
    });
  },
});
