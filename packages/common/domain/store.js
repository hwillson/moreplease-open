import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import StoreType from './store_type';

// Schemas
const ShippingMethodSchema = new SimpleSchema({
  externalId: {
    type: String,
    label: 'External ID',
  },
  name: {
    type: String,
    label: 'Name',
  },
  cost: {
    type: Number,
    decimal: true,
    label: 'Cost',
  },
});

const StoreSchema = new SimpleSchema({
  accountId: {
    type: String,
    autoform: {
      afFieldInput: {
        type: 'hidden',
      },
    },
  },
  storeType: {
    type: String,
    label: 'Store Type',
    optional: true,
    autoform: {
      type: 'select',
      options() {
        return StoreType.labelValues();
      },
    },
  },
  url: {
    type: String,
    label: 'Store URL',
  },
  subscriptionOrderUrl: {
    type: String,
    label: 'Subscription Order URL',
  },
  subscriptionPageUrl: {
    type: String,
    label: 'Subscription Page URL',
  },
  customerDetailsUrl: {
    type: String,
    label: 'Customer Details URL',
  },
  customerOrdersUrl: {
    type: String,
    label: 'Customer Orders URL',
  },
  webhookUrl: {
    type: String,
    label: 'Webhook URL',
    optional: true,
  },
  webServiceUrl: {
    type: String,
    label: 'Store Web Service URL',
    optional: true,
  },
  paymentServiceUrl: {
    type: String,
    label: 'External Payment Management Web Service URL',
    optional: true,
  },
  availableRenewalFrequencies: {
    type: [String],
    label: 'Available Renewal Frequencies',
  },
  storeWsAuthUser: {
    type: String,
    label: 'WS Authentication User',
  },
  storeWsAuthPass: {
    type: String,
    label: 'WS Authentication Password',
  },
  dateFormat: {
    type: String,
    label: 'Date Format',
    optional: true,
  },
  datePickerFormat: {
    type: String,
    label: 'Date Picker Format',
    optional: true,
  },
  supportedCurrencies: {
    type: [String],
    label: 'Supported Currencies',
    optional: true,
  },
  subscriptionRenewalStartTime: {
    type: String,
    label: 'Subscription Order Renewal Process Start Time',
    autoform: {
      type: 'select',
      options() {
        const options = [];
        ['am', 'pm'].forEach((identifier) => {
          for (let i = 1; i <= 12; i += 1) {
            options.push({
              label: `${i}:00 ${identifier}`,
              value: `${i}:00 ${identifier}`,
            });
          }
        });
        return options;
      },
    },
  },
  disableRenewals: {
    type: Boolean,
    label: 'Disable subscription order renewals',
  },
  defaultShippingMethod: {
    type: ShippingMethodSchema,
    label: 'Default Shipping Method',
  },
  freeShippingMethod: {
    type: ShippingMethodSchema,
    label: 'Free Shipping Method',
  },
  freeTrialShippingMethod: {
    type: ShippingMethodSchema,
    label: 'Free Trial Shipping Method',
  },
  freeShippingMinimum: {
    type: Number,
    label: 'Free Shipping Minimum (-1 to disable)',
    defaultValue: -1,
  },
});

// Model
const Store = {
  getDateFormat() {
    let dateFormat = this.dateFormat;
    if (!dateFormat) {
      dateFormat = 'YYYY-MM-DD';
    }
    return dateFormat;
  },

  getDatePickerFormat() {
    let datePickerFormat = this.datePickerFormat;
    if (!datePickerFormat) {
      datePickerFormat = 'yyyy-mm-dd';
    }
    return datePickerFormat;
  },
};

// Collection
const StoresCollection = new Mongo.Collection('stores', {
  transform(doc) {
    const store = Object.create(Store);
    _.extend(store, doc);
    return store;
  },
});
StoresCollection.attachSchema(StoreSchema);
export { StoresCollection };

// Methods
const StoreMethods = {
  create: new ValidatedMethod({
    name: 'MorePlease.methods.store.create',
    validate: StoreSchema.validator(),
    run(doc) {
      if (this.userId) {
        const newStore = doc;
        newStore.accountId = Meteor.user().accountId;
        StoresCollection.insert(newStore);
      }
    },
  }),

  update: new ValidatedMethod({
    name: 'MorePlease.methods.store.update',
    validate(args) {
      StoreSchema.validate(args.modifier, { modifier: true });
    },
    run(args) {
      if (this.userId) {
        StoresCollection.update(args._id, args.modifier);
      }
    },
  }),
};
export { StoreMethods };
