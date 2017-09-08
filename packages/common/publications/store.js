/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { StoresCollection } from '../domain/store';

Meteor.publish('store', function store(storeId) {
  check(storeId, Match.Maybe(String));
  let cursor;
  if (this.userId) {
    const accountId = Meteor.users.findOne({ _id: this.userId }).accountId;
    cursor = StoresCollection.find({ accountId });
  } else {
    cursor = StoresCollection.find({ _id: storeId });
  }
  return cursor;
});

Meteor.publish('customerStoreDetails', function customerStoreDetails(storeId) {
  check(storeId, String);
  return StoresCollection.find({
    storeId,
  }, {
    fields: {
      url: 1,
      subscriptionPageUrl: 1,
      availableRenewalFrequencies: 1,
    },
  });
});
