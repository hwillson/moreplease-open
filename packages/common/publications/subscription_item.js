import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { StoresCollection } from '../domain/store';
import SubscriptionItemsCollection from '../domain/subscription_item';

Meteor.publish(
  'subscriptionItems',
  function subscriptionItems(subscriptionId, storeId) {
    let cursor;
    check(subscriptionId, String);
    check(storeId, Match.Maybe(String));
    if (this.userId) {
      // Admin
      const accountId = Meteor.users.findOne({ _id: this.userId }).accountId;
      const store = StoresCollection.findOne({ accountId });
      cursor = SubscriptionItemsCollection.find({
        subscriptionId,
        storeId: store._id,
      });
    } else {
      // Customers
      check(storeId, String);
      cursor = SubscriptionItemsCollection.find({
        subscriptionId,
        storeId,
      });
    }
    return cursor;
  },
);
