import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import {
  emailsCollection,
  StoresCollection,
} from 'meteor/moreplease:common';

Meteor.publish('email', function email(emailType) {
  check(emailType, String);
  let cursor;
  if (!this.userId) {
    cursor = this.ready();
  } else {
    const accountId = Meteor.users.findOne({ _id: this.userId }).accountId;
    const store = StoresCollection.findOne({ accountId });
    cursor = emailsCollection.find({
      storeId: store._id,
      emailType,
    });
  }
  return cursor;
});
