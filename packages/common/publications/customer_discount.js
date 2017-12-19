/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { customerDiscountsCollection } from '../domain/customer_discount';

Meteor.publish('customerDiscounts', function customerDiscounts(customerId) {
  check(customerId, String);
  return customerDiscountsCollection.find({ customerId });
});
