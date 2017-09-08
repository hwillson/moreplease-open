import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Roles } from 'meteor/alanning:roles';

import keyControl from './key_control';

// Schema
const apiKeySchema = new SimpleSchema({
  key: {
    type: String,
    label: 'Key',
  },
  description: {
    type: String,
    label: 'Description',
    optional: true,
  },
  created: {
    type: Date,
    label: 'Created',
  },
  storeId: {
    type: String,
    label: 'Store ID',
  },
});

// Collection
export const apiKeysCollection = new Mongo.Collection('api_keys');
apiKeysCollection.attachSchema(apiKeySchema);

// Methods
export const apiKeyMethods = {
  create: new ValidatedMethod({
    name: 'MorePlease.methods.apiKey.create',
    validate: new SimpleSchema({
      storeId: { type: String },
      description: { type: String, optional: true },
    }).validator(),
    run({ storeId, description }) {
      if (!this.isSimulation) {
        if (this.userId && Roles.userIsInRole(this.userId, 'mp-admin')) {
          keyControl.newKey(storeId, description);
        }
      }
    },
  }),
};
