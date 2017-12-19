import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { moment } from 'meteor/momentjs:moment';

const customerDiscountSchema = new SimpleSchema({
  customerId: {
    type: String,
  },
  discountType: {
    type: String,
    defaultValue: 'product',
  },
  validFromDate: {
    type: Date,
  },
  validToDate: {
    type: Date,
  },
  durationMonths: {
    type: Number,
  },
  discountPercent: {
    type: Number,
  },
  status: {
    type: String,
    defaultValue: 'active',
  },
  label: {
    type: String,
  },
  storeId: {
    type: String,
  },
});

export const customerDiscountsCollection =
  new Mongo.Collection('customer_discounts');
customerDiscountsCollection.attachSchema(customerDiscountSchema);

customerDiscountsCollection.createNewDiscount = ({
  customerId,
  storeId,
  label,
  durationMonths,
  discountPercent,
}) => {
  // If a previous active customer discount exists, archive it (since
  // we're only allowing one active customer discount at a time, for now).
  customerDiscountsCollection.update({
    customerId,
    storeId,
  }, {
    $set: {
      status: 'archived',
    },
  });
console.log('durationMonths', durationMonths);
  const now = moment();
  const validFromDate = now.toDate();
  const validToDate = now.add(durationMonths, 'months').toDate();
  customerDiscountsCollection.insert({
    customerId,
    storeId,
    label,
    validFromDate,
    validToDate,
    durationMonths,
    discountPercent,
  });
};

customerDiscountsCollection.activeDiscountPercent =
  ({ customerId, storeId }) => {
    const discount = customerDiscountsCollection.findOne({
      customerId,
      storeId,
      status: 'active',
    });
    return discount ? discount.discountPercent : 0;
  };
