import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { moment } from 'meteor/momentjs:moment';

const collection = new Mongo.Collection('subscription_order_history');
collection.attachSchema(new SimpleSchema({
  storeId: {
    type: String,
  },
  subscriptionId: {
    type: String,
  },
  orderId: {
    type: String,
  },
  timestamp: {
    type: Date,
  },
}));

collection.hasOrderRenewedRecently =
  ({ storeId, subscriptionId }) => !!collection.findOne({
    storeId,
    subscriptionId,
    timestamp: {
      $gte: moment().subtract(1, 'minutes').toDate(),
    },
  });

export default collection;
