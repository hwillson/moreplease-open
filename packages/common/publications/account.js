import { Meteor } from 'meteor/meteor';

import { accountsCollection } from '../domain/account';

Meteor.publish('account', function account() {
  let cursor;
  if (!this.userId) {
    cursor = this.ready();
  } else {
    const user = Meteor.users.findOne({ _id: this.userId });
    cursor = accountsCollection.find({ _id: user.accountId });
  }
  return cursor;
});
