import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Roles } from 'meteor/alanning:roles';

// Schema
const supportSiteSchema = new SimpleSchema({
  accountId: {
    type: String,
    label: 'Account ID',
  },
  siteUrl: {
    type: String,
    label: 'Support Site URL',
  },
});

// Collection
const supportSitesCollection = new Mongo.Collection('support_sites');
supportSitesCollection.attachSchema(supportSiteSchema);

// Security
supportSitesCollection.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

// Methods
export default {
  create: new ValidatedMethod({
    name: 'MorePlease.methods.supportSite.create',
    validate: supportSiteSchema.validator(),
    run(doc) {
      if (this.userId && Roles.userIsInRole(this.userId, 'mp-admin')) {
        supportSitesCollection.insert(doc);
      }
    },
  }),

  getSiteUrl: new ValidatedMethod({
    name: 'MorePlease.methods.supportSite.getSiteUrl',
    validate: null,
    run() {
      if (!this.userId) {
        throw new Meteor.Error(
          'MorePlease.methods.supportSite.getSiteUrl',
          'You are not authorized to call this method.',
        );
      }
      const user = Meteor.users.findOne({ _id: this.userId });
      const supportSite =
        supportSitesCollection.findOne({
          accountId: user.accountId,
        });
      let siteUrl;
      if (supportSite) {
        siteUrl = supportSite.siteUrl;
      }
      return siteUrl;
    },
  }),
};
