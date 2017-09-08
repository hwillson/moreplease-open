import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Roles } from 'meteor/alanning:roles';
import { check, Match } from 'meteor/check';

import log from '../utilities/log';

// Schema
const accountSchema = new SimpleSchema({
  description: {
    type: String,
    label: 'Description',
  },
  storeIds: {
    type: [String],
    label: 'Store IDs',
    optional: true,
  },
});

// Collection
export const accountsCollection = new Mongo.Collection('accounts');
accountsCollection.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});
accountsCollection.attachSchema(accountSchema);

accountsCollection.hasStoreAccess = (accountId, storeId) => {
  const account = accountsCollection.findOne({ _id: accountId });
  let hasStoreAccess = false;
  if (account.storeIds.indexOf(storeId) > -1) {
    hasStoreAccess = true;
  }
  return hasStoreAccess;
};

// Methods
export const addStoreId = new ValidatedMethod({
  name: 'MorePlease.methods.account.addStoreId',
  validate: new SimpleSchema({
    storeId: { type: String },
  }).validator(),
  run({ storeId }) {
    if (this.userId && Meteor.user().accountId) {
      accountsCollection.update({
        _id: Meteor.user().accountId,
      }, {
        $addToSet: {
          storeIds: storeId,
        },
      });
    }
  },
});

Meteor.methods({
  createAccount(description) {
    check(description, Match.Maybe(String));
    let accountId;
    if (this.userId && Roles.userIsInRole(this.userId, 'mp-admin')) {
      new SimpleSchema({
        description: { type: String },
      }).validate({ description });
      if (description) {
        accountId = accountsCollection.insert({
          description,
        }, (error, result) => {
          log.info(
            '[MorePlease.collections.accounts.createAccount] Account created: '
            + `${result}`,
          );
        });
      }
    }
    return accountId;
  },

  addUserToAccount(userId, accountId) {
    check(userId, Match.Maybe(String));
    check(accountId, Match.Maybe(String));
    if (this.userId && Roles.userIsInRole(this.userId, 'mp-admin')) {
      new SimpleSchema({
        userId: { type: String },
      }).validate({ userId });
      Meteor.users.update(userId, {
        $set: {
          accountId,
        },
      }, () => {
        log.info(
          '[MorePlease.collections.accounts.addUserToAccount] User added to '
          + 'account.',
        );
      });
    }
  },
});
