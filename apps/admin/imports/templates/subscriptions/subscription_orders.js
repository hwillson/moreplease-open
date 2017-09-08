import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import {
  StoresCollection,
  subscriptionOrdersCollection,
} from 'meteor/moreplease:common';

import './subscription_orders.html';

const getStore = () => StoresCollection.findOne();

Template.adminSubscriptionOrders.onCreated(function onCreated() {
  this.subscribe('store');
  this.subscribe('subscriptionOrders', Session.get('subscriptionId'));
});

Template.adminSubscriptionOrders.helpers({
  ordersExist() {
    return subscriptionOrdersCollection.find().count();
  },

  orders() {
    return subscriptionOrdersCollection.find();
  },

  orderUrl() {
    return getStore().subscriptionOrderUrl + this.orderId;
  },

  store() {
    return getStore();
  },
});
