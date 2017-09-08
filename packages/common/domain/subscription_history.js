import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';

// Schema
const subscriptionHistorySchema = new SimpleSchema({
  subscriptionId: {
    type: String,
  },
  timestamp: {
    type: Date,
  },
  statusId: {
    type: String,
  },
  storeId: {
    type: String,
  },
});

// Collection
const subscriptionHistoryCollection =
  new Mongo.Collection('subscription_history');
subscriptionHistoryCollection.attachSchema(subscriptionHistorySchema);

export default subscriptionHistoryCollection;
