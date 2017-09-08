import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

// Schema
const SubscriptionCustomerSchema = new SimpleSchema({
  externalId: {
    type: Number,
    optional: true,
    label: 'External ID',
  },
  firstName: {
    type: String,
    label: 'First Name',
  },
  lastName: {
    type: String,
    label: 'Last Name',
  },
  email: {
    type: String,
    label: 'Email',
  },
  phone: {
    type: String,
    optional: true,
  },
  storeId: {
    type: String,
    label: 'Store ID',
  },
  stripeCustomerId: {
    type: String,
    optional: true,
  },
});

// Collection
const SubscriptionCustomersCollection =
  new Mongo.Collection('subscription_customers');
SubscriptionCustomersCollection.attachSchema(SubscriptionCustomerSchema);
export default SubscriptionCustomersCollection;

// Methods
Meteor.methods({
  createCustomer(customer) {
    check(customer, Object);
    const existingCustomer =
      SubscriptionCustomersCollection.findOne({
        externalId: customer.externalId,
      });
    let customerId;
    if (!existingCustomer) {
      customerId =
        SubscriptionCustomersCollection.insert(customer);
    } else {
      customerId = existingCustomer._id;
    }
    return customerId;
  },
});
