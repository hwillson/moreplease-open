/* global MorePlease */

import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';

import subscriptionOrderType from './subscription_order_type';
import subscriptionOrderHistoryCollection from './subscription_order_history';

let subscriptionOrdersCollection;

// Schema
const subscriptionOrderSchema = new SimpleSchema({
  subscriptionId: {
    type: String,
    label: 'Subscription ID',
  },
  orderId: {
    type: Number,
    label: 'Order ID',
  },
  orderTypeId: {
    type: String,
    label: 'Order Type ID',
  },
  orderDate: {
    type: Date,
    label: 'Order Date',
  },
  storeId: {
    type: String,
    label: 'Store ID',
  },
  totalPrice: {
    type: Number,
    decimal: true,
    optional: true,
  },
});

// Model
export const subscriptionOrder = {
  orderTypeLabel() {
    return subscriptionOrderType[this.orderTypeId].label;
  },

  orderUrl() {
    let companyRole;
    if (Meteor.isClient) {
      companyRole = MorePlease.session.get('companyRole');
      if (!companyRole) {
        companyRole = MorePlease.utilities.role.companyRole(Meteor.userId());
      }
    } else {
      companyRole = MorePlease.utilities.role.companyRole(this.userId);
    }
    return Meteor.settings.public[companyRole].subscriptionOrderUrl
      + this.orderId;
  },

  isFirstOrder() {
    let isFirstOrder = false;
    const orderCount = subscriptionOrdersCollection.find({
      subscriptionId: this.subscriptionId,
    }).count();
    if (orderCount === 1) {
      isFirstOrder = true;
    }
    return isFirstOrder;
  },
};

// Collection
subscriptionOrdersCollection =
  new Mongo.Collection('subscription_orders', {
    transform(doc) {
      const newSubscriptionOrder = Object.create(doc);
      _.extend(newSubscriptionOrder, subscriptionOrder);
      return newSubscriptionOrder;
    },
  });

subscriptionOrdersCollection.attachSchema(subscriptionOrderSchema);

subscriptionOrdersCollection.after.insert((userId, doc) => {
  const orderId = this._id || doc._id.ops[0]._id;
  if (orderId) {
    subscriptionOrderHistoryCollection.insert({
      storeId: doc.storeId,
      subscriptionId: doc.subscriptionId,
      orderId,
      timestamp: new Date(),
    });
  }
});

subscriptionOrdersCollection.currentDayRenewalCount =
  function currentDayRenewalCount(storeId) {
    const today = new Date();
    const utcStartOfDay = new Date(
      Date.UTC(
        today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0,
      ),
    );
    const utcEndOfDay = new Date(
      Date.UTC(
        today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 9999,
      ),
    );
    const orders = this.find({
      storeId,
      orderDate: {
        $gte: utcStartOfDay,
        $lte: utcEndOfDay,
      },
    });
    let renewalCount = 0;
    orders.forEach((order) => {
      if (!order.isFirstOrder()) {
        renewalCount += 1;
      }
    });
    return renewalCount;
  };

export { subscriptionOrdersCollection };
