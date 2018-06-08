import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { moment } from 'meteor/momentjs:moment';

import { StoresCollection } from './store';
import SubscriptionCustomersCollection from './subscription_customer';
import SubscriptionItemsCollection from './subscription_item';
import SubscriptionStatus from './subscription_status';
import { createHistoryEntry } from './subscription_history';
import subscriptionRenewalFrequency from './subscription_renewal_frequency';
import date from '../utilities/date';
import { subscriptionOrdersCollection } from './subscription_order';
import { accountsCollection } from './account';
import apiAccess from '../api_access/api_access';
import { ProductsCollection } from './product';

// Schema
const SubscriptionSchema = new SimpleSchema({
  customerId: {
    type: String,
    label: 'Customer ID',
    optional: true,
  },
  customerFirstName: {
    type: String,
    label: 'Customer First Name',
  },
  customerLastName: {
    type: String,
    label: 'Customer Last Name',
  },
  customerEmail: {
    type: String,
    label: 'Email',
  },
  startDate: {
    type: Date,
    label: 'Start Date',
    optional: true,
  },
  migratedStartDate: {
    type: Date,
    label: 'Old Migrated Start Date',
    optional: true,
  },
  renewalFrequencyId: {
    type: String,
    label: 'Renewal Frequency',
    defaultValue: subscriptionRenewalFrequency.m1.id,
  },
  renewalDate: {
    type: Date,
    label: 'Renewal Date',
    optional: true,
  },
  migratedRenewalDate: {
    type: Date,
    label: 'Old Migrated Renewal Date',
    optional: true,
  },
  statusId: {
    type: String,
    label: 'Status ID',
    optional: true,
  },
  shippingMethodId: {
    type: String,
    label: 'Shipping Method ID',
    optional: true,
  },
  shippingMethodName: {
    type: String,
    label: 'Shipping Method Name',
    optional: true,
  },
  shippingCost: {
    type: Number,
    label: 'Shipping Cost',
    optional: true,
    decimal: true,
  },
  currency: {
    type: String,
    label: 'Subscription Currency',
    defaultValue: 'USD', // http://openexchangerates.org/api/currencies.json
  },
  storeId: {
    type: String,
    label: 'Store ID',
  },
  draftOrderId: {
    type: String,
    optional: true,
  },
  draftOrderChanges: {
    type: Boolean,
    defaultValue: false,
    optional: true,
  },
  billingRetryCount: {
    type: Number,
    optional: true,
    defaultValue: 0,
  },
  notes: {
    type: String,
    optional: true,
  },
});

let SubscriptionsCollection;
const SubscriptionMethods = {};

// Model
const Subscription = {
  customerName() {
    return `${this.customerFirstName} ${this.customerLastName}`;
  },

  updateSubscriptionStatus(statusId) {
    const previousStatusId = this.statusId;
    if (statusId && (statusId !== previousStatusId)) {
      SubscriptionsCollection.update(
        { _id: this._id },
        {
          $set: {
            statusId,
          },
        },
      );

      const store = StoresCollection.findOne({ _id: this.storeId });
      const eventDetails = {
        subscriptionId: this._id,
        subscriptionStatus: statusId,
        customerEmail: this.customerEmail,
        externalCustomerId:
          this.getCustomer() ? this.getCustomer().externalId : null,
        nextShipmentDate: this.renewalDate,
        totalSubscriptionPrice: +this.subscriptionTotal().toFixed(2),
        subscriptionItems: this.getSubscriptionItems(),
      };

      // If the current status is "failed" and the new status is "active",
      // reset the billing retry count back to 0 to make sure billing for
      // renewal payments is resumed.
      if (this.statusId === SubscriptionStatus.failed.id
          && statusId === SubscriptionStatus.active.id) {
        this.resetBillingRetryCount();

        Meteor.call('transmitEvent', {
          store,
          event: 'Failed Payment Fixed',
          extra: eventDetails,
        });
      }

      createHistoryEntry.call({
        storeId: this.storeId,
        subscriptionId: this._id,
        statusId,
        subscriptionTotal: this.subscriptionTotal(),
      });

      // Fire subscription status changed event
      const events = {
        active: 'Resumed Subscription',
        cancelled: 'Cancelled Subscription',
        paused: 'Paused Subscription',
        failed: 'Payment Failed',
      };
      if (Object.keys(events).indexOf(statusId) > -1) {
        Meteor.call('transmitEvent', {
          store,
          event: events[statusId],
          extra: eventDetails,
        });
      }
    }
  },

  updateRenewalDate(renewalDate, dateFormat) {
    if (renewalDate &&
        renewalDate !== date.formatDate(this.renewalDate, dateFormat)) {
      const newRenewalDate =
        date.newMomentWithDefaultTime(renewalDate, dateFormat);
      SubscriptionsCollection.update(
        { _id: this._id },
        {
          $set: {
            renewalDate: newRenewalDate.toDate(),
          },
        },
      );
    }
  },

  setRenewalDateToTomorrow(dateFormat) {
    const newRenewalDate =
      date.newMomentWithDefaultTime(this.renewalDate, dateFormat).add(1, 'days');
    SubscriptionsCollection.update(
      { _id: this._id },
      {
        $set: {
          renewalDate: newRenewalDate.toDate(),
        },
      },
    );
  },

  updateRenewalFrequency(frequencyId) {
    if (frequencyId) {
      SubscriptionsCollection.update(
        { _id: this._id },
        {
          $set: {
            renewalFrequencyId: frequencyId,
          },
        },
      );
    }
  },

  resetRenewalDate(dateFormat) {
    const nextRenewalDate =
      subscriptionRenewalFrequency.renewalDateForFrequency(
        this.renewalFrequencyId,
      );
    this.updateRenewalDate(nextRenewalDate, dateFormat);
  },

  getSubscriptionItems() {
    const allSubItems = SubscriptionItemsCollection.find({
      subscriptionId: this._id,
    });
    const availableSubItems =
      ProductsCollection.filterNonMatchingSubItems(this.storeId, allSubItems);
    return availableSubItems;
  },

  // hasDiscount() {
  //   return SubscriptionItemsCollection.find({ $and: [
  //     { subscriptionId: this._id },
  //     { discountPercent: { $exists: true } },
  //     { discountPercent: { $gt: 0 } },
  //   ] }).count();
  // },

  getCustomer() {
    return SubscriptionCustomersCollection.findOne({
      _id: this.customerId,
    });
  },

  cancelSubscription(apiKey) {
    SubscriptionMethods.cancelSubscription.call({
      subscriptionId: this._id,
      apiKey,
    });
  },

  subscriptionSubtotal() {
    const subscriptionItems = this.getSubscriptionItems();
    let subscriptionSubtotal = 0;
    const currency = this.currency;
    subscriptionItems.forEach((subscriptionItem) => {
      subscriptionSubtotal += subscriptionItem.totalCurrentPrice(currency);
    });
    return subscriptionSubtotal;
  },

  subscriptionTotal() {
    this.refreshShipping();
    let subscriptionTotal = this.subscriptionSubtotal();
    if (this.shippingCost) {
      subscriptionTotal += this.shippingCost;
    }
    return subscriptionTotal;
  },

  subscriptionTotals() {
    const totals = {
      subtotal: 0,
      total: 0,
    };

    // Subtotal
    const subscriptionItems = this.getSubscriptionItems();
    const currency = this.currency;
    subscriptionItems.forEach((subscriptionItem) => {
      totals.subtotal += subscriptionItem.totalDiscountedPrice(
        currency,
        this.customerId,
      );
    });

    // Total
    totals.total = totals.subtotal;
    if (this.shippingCost) {
      totals.total += this.shippingCost;
    }

    return totals;
  },

  subscriptionDiscount() {
    const subscriptionItems = this.getSubscriptionItems();
    let discount = 0;
    const currency = this.currency;
    subscriptionItems.forEach((subscriptionItem) => {
      discount += (
        subscriptionItem.totalPrice(currency)
        - subscriptionItem.totalCurrentPrice(currency)
      );
    });
    return discount;
  },

  refreshShipping() {
    const store = StoresCollection.findOne({
      _id: this.storeId,
    });
    if (store && store.freeShippingMinimum > -1) {
      let shippingMethod;
      if (this.subscriptionSubtotal() >= store.freeShippingMinimum) {
        shippingMethod = store.freeShippingMethod;
      } else if (this.isFreeTrialSubscription()) {
        shippingMethod = store.freeTrialShippingMethod;
      } else {
        shippingMethod = store.defaultShippingMethod;
      }
      if (this.shippingMethodId !== shippingMethod.externalId) {
        SubscriptionsCollection.update(
          { _id: this._id },
          {
            $set: {
              shippingMethodId: shippingMethod.externalId,
              shippingMethodName: shippingMethod.name,
              shippingCost: shippingMethod.cost,
            },
          },
        );
      }
    }
  },

  getShippingCost() {
    return this.shippingCost || 0;
  },

  isFreeTrialSubscription() {
    const subItems = this.getSubscriptionItems();
    return subItems.length === 1
      && subItems[0].productVariation().isFreeTrialProduct();
  },

  isNewFreeTrialSubscription() {
    return this.isFreeTrialSubscription()
      && subscriptionOrdersCollection.find({
        subscriptionId: this._id,
      }).count() === 1;
  },

  increaseBillingRetryCount() {
    SubscriptionsCollection.update({
      _id: this._id,
    }, {
      $inc: {
        billingRetryCount: 1,
      },
    });
  },

  resetBillingRetryCount() {
    SubscriptionsCollection.update({
      _id: this._id,
    }, {
      $set: {
        billingRetryCount: 0,
      },
    });
  },

  daysSinceFirstOrder() {
    const firstOrder = subscriptionOrdersCollection.findOne({
      subscriptionId: this._id,
    }, {
      sort: {
        orderDate: 1,
      },
    });
    return moment().diff(moment(firstOrder.orderDate), 'days');
  },

  renewalCount() {
    const orderCount = subscriptionOrdersCollection.find({
      subscriptionId: this._id,
    }).count();
    return orderCount ? orderCount - 1 : 0;
  },

  updateNotes(notes) {
    if (notes) {
      SubscriptionsCollection.update(
        { _id: this._id },
        {
          $set: {
            notes,
          },
        },
      );
    }
  },
};

export { Subscription };

// Collection
SubscriptionsCollection = new Mongo.Collection('subscriptions', {
  transform(doc) {
    const subscription = Object.create(doc);
    _.extend(subscription, Subscription);
    return subscription;
  },
});
SubscriptionsCollection.attachSchema(SubscriptionSchema);
export { SubscriptionsCollection };

// Methods

SubscriptionMethods.getStatusCounts = new ValidatedMethod({
  name: 'subscription.getStatusCounts',
  validate: null,
  run() {
    const statusCounts = [];
    if (!this.isSimulation) {
      if (this.userId) {
        const user = Meteor.users.findOne({ _id: this.userId });
        const store = StoresCollection.findOne({ accountId: user.accountId });
        const statusIds = SubscriptionStatus.getStatusIds();
        statusIds.forEach((statusId) => {
          const statusCount = SubscriptionsCollection.find({
            storeId: store._id,
            statusId,
          }, {
            fields: {
              statusId: 1,
            },
          }).count();
          statusCounts.push({
            name: SubscriptionStatus.getLabel(statusId),
            y: statusCount,
          });
        });
      }
    }
    return statusCounts;
  },
});

SubscriptionMethods.getRenewalCounts = new ValidatedMethod({
  name: 'subscription.getRenewalCounts',
  validate: null,
  run() {
    const renewalCounts = {
      yesterday: 0,
      today: 0,
      tomorrow: 0,
    };
    if (!this.isSimulation) {
      if (this.userId) {
        const user = Meteor.users.findOne({ _id: this.userId });
        const store = StoresCollection.findOne({ accountId: user.accountId });

        renewalCounts.yesterday =
          subscriptionOrdersCollection.find({
            storeId: store._id,
            orderDate: {
              $gte: moment().subtract(1, 'days').startOf('day').toDate(),
              $lte: moment().subtract(1, 'days').endOf('day').toDate(),
            },
          }).count();

        renewalCounts.today =
          subscriptionOrdersCollection.find({
            storeId: store._id,
            orderDate: {
              $gte: moment().startOf('day').toDate(),
              $lte: moment().endOf('day').toDate(),
            },
          }).count();

        renewalCounts.tomorrow =
          SubscriptionsCollection.find({
            storeId: store._id,
            renewalDate: {
              $gte: moment().add(1, 'days').startOf('day').toDate(),
              $lte: moment().add(1, 'days').endOf('day').toDate(),
            },
            statusId: SubscriptionStatus.active.id,
          }).count();
      }
    }
    return renewalCounts;
  },
});

SubscriptionMethods.cancelSubscription = new ValidatedMethod({
  name: 'subscription.cancelSubscription',
  validate: new SimpleSchema({
    subscriptionId: { type: String },
    apiKey: { type: String, optional: true },
  }).validator(),
  run({ subscriptionId, apiKey }) {
    check(subscriptionId, String);
    let subscriptionCancelled = false;
    if (this.isSimulation) {
      subscriptionCancelled = true;
    } else {
      if (!this.userId) {
        // Not logged in, so cancellation is coming from customer frontend.
        const storeId = apiAccess.findStoreIdForApiKey(apiKey);
        const subscription = SubscriptionsCollection.findOne({
          _id: subscriptionId,
          storeId,
        });
        if (subscription) {
          import subscriptionManager from '../manage/subscription_manager';
          subscriptionCancelled =
            subscriptionManager.cancelSubscription(subscriptionId);
        }
      } else {
        // Logged in, so cancellation is coming from the admin.
        const subscription = SubscriptionsCollection.findOne({
          _id: subscriptionId,
        });
        const accountId = Meteor.user().accountId;
        if (accountsCollection.hasStoreAccess(
          accountId,
          subscription.storeId,
        )) {
          import subscriptionManager from '../manage/subscription_manager';
          subscriptionCancelled =
            subscriptionManager.cancelSubscription(subscriptionId);
        }
      }
    }
    return subscriptionCancelled;
  },
});

SubscriptionMethods.createSubscriptionRenewal = new ValidatedMethod({
  name: 'subscription.createSubscriptionRenewal',
  validate: new SimpleSchema({
    subscriptionId: { type: String },
  }).validator(),
  run({ subscriptionId }) {
    check(subscriptionId, String);
    let renewed;
    if (!this.isSimulation && this.userId) {
      import subscriptionManager from '../manage/subscription_manager';
      renewed = subscriptionManager.createSubscriptionRenewal(
        subscriptionId,
      );
    }
    return renewed;
  },
});

export { SubscriptionMethods };
