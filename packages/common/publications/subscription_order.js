/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { subscriptionOrdersCollection } from '../domain/subscription_order';

Meteor.publish('subscriptionOrders', function subscriptionOrders(subscriptionId) {
  check(subscriptionId, String);
  let cursor;
  if (this.userId) {
    cursor = subscriptionOrdersCollection.find({
      subscriptionId,
    });
  } else {
    cursor = this.ready();
  }
  return cursor;
});
