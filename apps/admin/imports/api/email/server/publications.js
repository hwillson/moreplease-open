import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

Meteor.publish('email', function email(emailType) {
  check(emailType, String);
  if (!this.userId) {
    this.ready();
  } else {
    const accountId = Meteor.users.findOne({ _id: this.userId }).accountId;
    const store = MorePlease.collections.stores.findOne({ accountId });
    return MorePlease.collections.emails.find({
      storeId: store._id,
      emailType
    });
  }
});
