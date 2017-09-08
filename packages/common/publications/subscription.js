import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { ReactiveTable } from 'meteor/aslagle:reactive-table';

import { SubscriptionsCollection } from '../domain/subscription';
import { StoresCollection } from '../domain/store';
import SubscriptionStatus from '../domain/subscription_status';

Meteor.publish(
  'subscriptionNotCancelled',
  function subscriptionNotCancelled(subscriptionId, storeId) {
    check(subscriptionId, String);
    check(storeId, String);
    let cursor;
    if (!subscriptionId || !storeId) {
      cursor = this.ready();
    } else {
      cursor = SubscriptionsCollection.find({
        _id: subscriptionId,
        storeId,
        statusId: {
          $in: [
            SubscriptionStatus.active.id,
            SubscriptionStatus.paused.id,
            SubscriptionStatus.failed.id,
          ],
        },
      });
    }
    return cursor;
  },
);

Meteor.publish(
  'subscriptionAnyStatus',
  function subscriptionAnyStatus(subscriptionId) {
    check(subscriptionId, String);
    let cursor;
    if (!this.userId) {
      cursor = this.ready();
    } else {
      const user = Meteor.users.findOne({ _id: this.userId });
      const store = StoresCollection.findOne({ accountId: user.accountId });
      cursor = SubscriptionsCollection.find({
        _id: subscriptionId,
        storeId: store._id,
      });
    }
    return cursor;
  },
);

Meteor.publish('allSubscriptions', function allSubscriptions() {
  let cursor;
  if (!this.userId) {
    cursor = this.ready();
  } else {
    const user = Meteor.users.findOne({ _id: this.userId });
    const store = StoresCollection.findOne({ accountId: user.accountId });
    cursor = SubscriptionsCollection.find({
      storeId: store._id,
    });
  }
  return cursor;
});

ReactiveTable.publish(
  'subscriptionsTable',
  SubscriptionsCollection,
  function subscriptionsTable() {
    const user = Meteor.users.findOne({ _id: this.userId });
    const store = StoresCollection.findOne({ accountId: user.accountId });
    return {
      storeId: store._id,
    };
  },
);
