/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';

Meteor.publish('userData', function userData() {
  let cursor;
  if (!this.userId) {
    cursor = this.ready();
  } else {
    cursor = Meteor.users.find(
      { _id: this.userId },
      { fields: { accountId: 1 } },
    );
  }
  return cursor;
});
