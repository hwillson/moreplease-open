/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import SubscriptionCustomersCollection from '../domain/subscription_customer';
import { accountsCollection } from '../domain/account';

Meteor.publish('singleCustomer', function singleCustomer(customerId) {
  check(customerId, String);
  let cursor;
  if (!this.userId) {
    cursor = this.ready();
  } else {
    const customer = SubscriptionCustomersCollection.find({
      _id: customerId,
    });
    const accountId = Meteor.users.findOne({ _id: this.userId }).accountId;
    if (!accountsCollection.hasStoreAccess(
      accountId, customer.fetch()[0].storeId,
    )) {
      cursor = this.ready();
    } else {
      cursor = customer;
    }
  }
  return cursor;
});
