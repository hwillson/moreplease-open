import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import emailType from './email_type';
import { StoresCollection } from '../domain/store';

// Schema
const emailSchema = new SimpleSchema({
  enabled: {
    type: Boolean,
    label: 'Enabled?',
    optional: true,
    autoform: {
      type: 'boolean-checkbox',
    },
  },
  storeId: {
    type: String,
    autoform: {
      afFieldInput: {
        type: 'hidden',
      },
    },
  },
  emailType: {
    type: String,
    label: 'Email Type',
    allowedValues: emailType.allTypes(),
    autoform: {
      afFieldInput: {
        type: 'hidden',
      },
    },
  },
  from: {
    type: String,
    label: 'From Address',
  },
  bcc: {
    type: String,
    label: 'BCC',
    regEx: SimpleSchema.RegEx.Email,
    optional: true,
  },
  subject: {
    type: String,
    label: 'Email Subject',
  },
  body: {
    type: String,
    label: 'Email Body',
    autoform: {
      afFieldInput: {
        type: 'textarea',
      },
    },
  },
});

// Collections
export const emailsCollection = new Mongo.Collection('emails');
emailsCollection.attachSchema(emailSchema);

// Security
emailsCollection.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

// Methods
export const emailMethods = {
  create: new ValidatedMethod({
    name: 'MorePlease.methods.email.create',
    validate: emailSchema.validator(),
    run(doc) {
      if (this.userId) {
        const store =
          StoresCollection.findOne({
            accountId: Meteor.user().accountId,
          });
        const newDoc = Object.assign(doc, { storeId: store.id });
        emailsCollection.insert(newDoc);
      }
    },
  }),

  update: new ValidatedMethod({
    name: 'MorePlease.methods.email.update',
    validate(args) {
      emailSchema.validate(args.modifier, { modifier: true });
    },
    run(args) {
      if (this.userId) {
        emailsCollection.update(args._id, args.modifier);
      }
    },
  }),

  send: '',
};
