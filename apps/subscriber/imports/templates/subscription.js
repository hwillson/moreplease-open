/* global window, URLSearchParams */

import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { moment } from 'meteor/momentjs:moment';
import swal from 'sweetalert';
import 'url-search-params-polyfill';

import {
  StoresCollection,
  SubscriptionsCollection,
  SubscriptionItemsCollection,
  SubscriptionStatus,
  date as dateUtil,
  price as priceUtil,
  ProductsCollection,
  subscriptionRenewalFrequency,
} from 'meteor/moreplease:common';

import './subscription.html';

const urlParams = new URLSearchParams(window.location.search);
const API_KEY = urlParams.get('token');
if (!API_KEY) {
  throw new Error('Missing access token.');
}

const SUB_ID = urlParams.get('id');
if (!SUB_ID) {
  throw new Error('Missing subscription ID.');
}

const initSubscriptions = (template) => {
  const storeId = Session.get('storeId');
  template.subscribe('store', storeId);
  template.subscribe(
    'subscriptionNotCancelled',
    SUB_ID,
    storeId,
    {
      onReady() {
        const subscription = SubscriptionsCollection.findOne();
        console.log(SUB_ID, storeId, subscription);
        template.subscribe('singleCustomer', subscription.customerId);
      },
    },
  );
  template.subscribe('subscriptionItems', SUB_ID, storeId);
  template.subscribe('productsForSubscription', SUB_ID);
  template.subscribe('customerStoreDetails', storeId);
  template.subscriptionsInitialized.set(true);
};

const verifyAccess = () => {
  const template = Template.instance();
  const storeId = Session.get('storeId');
  if (!storeId) {
    if (API_KEY) {
      Meteor.call('findStoreIdForApiKey', API_KEY, (error, result) => {
        Session.set('storeId', result);
        initSubscriptions(template);
      });
    } else {
      throw new Error('Missing access token.');
    }
  } else {
    initSubscriptions(template);
  }
};

const getStore = () => StoresCollection.findOne();

Template.body.onCreated(function onCreated() {
  this.subscriptionsInitialized = new ReactiveVar(false);

  this.autorun(() => {
    verifyAccess();
  });

  // If called from an iframe, pass the content height back to the iframe so
  // it can re-size dynamically.
  if (window.location !== window.parent.location) {
    this.autorun(() => {
      if (Template.instance().subscriptionsReady()) {
        if (SubscriptionItemsCollection.find().fetch()) {
          Tracker.afterFlush(() => {
            $('img:last').on('load', () => {
              const parentUrl = getStore().subscriptionPageUrl;
              $.postMessage({
                if_height: $('body').outerHeight(true),
              }, parentUrl);
            });
          });
        }
      }
    });
  }
});

Template.body.onRendered(function onRendered() {
  const instance = Template.instance();
  this.autorun(() => {
    if (instance.subscriptionsInitialized.get()
        && instance.subscriptionsReady()) {
      const subscription = SubscriptionsCollection.findOne();
      if (subscription
          && ((subscription.statusId === SubscriptionStatus.paused.id)
            || (subscription.statusId === SubscriptionStatus.failed.id))) {
        Meteor.defer(() => {
          $('.sub-pause').hide();
          $('.sub-resume').show();
        });
      }

      Meteor.defer(() => {
        $('.sub-renewal-date').datepicker({
          format: getStore().getDatePickerFormat(),
          autoclose: true,
          startDate: moment().add(1, 'days').format(getStore().dateFormat),
        });
      });

      Meteor.defer(() => {
        if (subscription) {
          $('.sub-renewal-freq').val(subscription.renewalFrequencyId);
        }
      });
    }
  });
});

const getCurrentSubscription = () => SubscriptionsCollection.findOne();

Template.body.helpers({
  subscription() {
    return getCurrentSubscription();
  },

  subscriptionCurrency() {
    const subscription = getCurrentSubscription();
    return subscription.currency;
  },

  subscriptionRenewalDate() {
    const subscription = getCurrentSubscription();
    return dateUtil.formatDate(subscription.renewalDate);
  },

  subscriptionStatusLabel() {
    return SubscriptionStatus[this.statusId].label;
  },

  subscriptionItemsExist() {
    let subscriptionItemsCount = 0;
    const subscription = getCurrentSubscription();
    if (subscription) {
      subscriptionItemsCount =
        SubscriptionItemsCollection.find().count();
    }
    return subscriptionItemsCount;
  },

  subscriptionItems() {
    return SubscriptionItemsCollection.find();
  },

  subscriptionItemPrice(subscriptionItem) {
    const currency = getCurrentSubscription().currency;
    const totalPrice = subscriptionItem.totalPrice(currency);
    return priceUtil.formatPrice(totalPrice, currency);
  },

  subscriptionItemDiscountedPrice(subscriptionItem) {
    let discountedPrice;
    if (subscriptionItem.discountPercent) {
      const currency = getCurrentSubscription().currency;
      const totalPrice = subscriptionItem.totalDiscountedPrice(currency);
      discountedPrice = priceUtil.formatPrice(totalPrice, currency);
    }
    return discountedPrice;
  },

  variations() {
    return ProductsCollection.findProductVariations(
      this.productId,
    );
  },

  selectedIfEquals(selectedVariationId) {
    return (this.variationId === selectedVariationId) ? 'selected' : '';
  },

  paymentFailed() {
    let paymentFailed = false;
    const subscription = getCurrentSubscription();
    if (subscription.statusId ===
        SubscriptionStatus.failed.id) {
      paymentFailed = true;
    }
    return paymentFailed;
  },

  isPaused() {
    const subscription = getCurrentSubscription();
    return (SubscriptionStatus.paused.id ===
        subscription.statusId);
  },

  availableRenewalFrequencies() {
    return getStore().availableRenewalFrequencies;
  },

  store() {
    return getStore();
  },

  subscriptionsInitialized() {
    const instance = Template.instance();
    return instance.subscriptionsInitialized.get()
      && instance.subscriptionsReady();
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

  formatPrice(price, currency) {
    return priceUtil.formatPrice(price, currency);
  },

  frequencyLabel(frequencyId) {
    let label;
    if (frequencyId) {
      label = subscriptionRenewalFrequency[frequencyId].label;
    }
    return label;
  },

  formatDate(date, dateFormat) {
    return dateUtil.formatDate(date, dateFormat);
  },

  formatLongDate(date) {
    return dateUtil.formatLongDate(date);
  },
});

Template.body.events({
  'click .remove-sub-item'(event) {
    event.preventDefault();
    this.remove();
  },

  'click .sub-pause'(event) {
    event.preventDefault();
    swal({
      title: 'Pause Your Subscription?',
      text: 'Are you sure you want to pause your subscription? Pausing ' +
            'means shipments will be put on-hold and you will not be ' +
            'charged until your resume your subscription.',
      icon: 'warning',
      buttons: {
        cancel: {
          text: 'Cancel',
          visible: true,
          value: false,
        },
        confirm: {
          text: 'Definitely',
          closeModal: true,
          value: true,
        },
      },
      dangerMode: true,
      className: 'mp-widget',
    }).then((confirmed) => {
      if (confirmed) {
        this.updateSubscriptionStatus(SubscriptionStatus.paused.id);
        $('.sub-pause').hide();
        $('.sub-resume').show();
      }
    });
  },

  'click .sub-resume'(event) {
    event.preventDefault();
    this.updateSubscriptionStatus(SubscriptionStatus.active.id);
    $('.sub-resume').hide();
    $('.sub-pause').show();
  },

  'click .sub-cancel'(event) {
    event.preventDefault();
    swal({
      title: 'Cancel Your Subscription?',
      text: 'Are you sure you want to cancel your subscription? ' +
            'Cancelling will completely remove your subscription from your ' +
            'account (all subscription items will be removed). You will no ' +
            'longer receive subscription shipments.',
      icon: 'warning',
      buttons: {
        cancel: {
          text: 'Keep Subscription',
          visible: true,
          value: false,
        },
        confirm: {
          text: 'Cancel Subscription',
          closeModal: true,
          value: true,
        },
      },
      dangerMode: true,
      className: 'mp-widget',
    }).then((confirmed) => {
      if (confirmed) {
        this.cancelSubscription(API_KEY);
      }
    });
  },

  'change .sub-renewal-date': _.debounce(function debounce(event) {
    const selectedDate = $(event.currentTarget).val();
    if (selectedDate) {
      this.updateRenewalDate(selectedDate, getStore().dateFormat);
    } else {
      $(event.currentTarget).val(
        dateUtil.formatDate(
          this.renewalDate,
          getStore().dateFormat,
        ),
      );
    }
  }, 100),

  'change .sub-renewal-freq'(event) {
    const frequencyId = $(event.currentTarget).find(':selected').val();
    this.updateRenewalFrequency(frequencyId);
  },

  'click .quantity-up'(event) {
    this.setQuantity(this.quantity + 1);
    $(event.currentTarget).blur();
  },

  'click .quantity-down'(event) {
    const quantity = this.quantity;
    if (quantity > 1) {
      this.setQuantity(this.quantity - 1);
    }
    $(event.currentTarget).blur();
  },

  'change .quantity'(event) {
    const quantity = $(event.currentTarget).val();
    this.setQuantity(quantity);
  },

  'change .sub-item-variations'(event) {
    const variationId = $(event.currentTarget).val();
    this.updateVariationId(variationId);
  },
});
