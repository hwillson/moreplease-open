import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { check } from 'meteor/check';

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
  previousStatusId: {
    type: String,
    optional: true,
  },
  previousTimestamp: {
    type: Date,
    optional: true,
  },
  subscriptionTotalWhenStatusChanged: {
    type: Number,
    decimal: true,
    optional: true,
  },
});

// Collection
const subscriptionHistoryCollection =
  new Mongo.Collection('subscription_history');
subscriptionHistoryCollection.attachSchema(subscriptionHistorySchema);

subscriptionHistoryCollection.createHistoryEntry = ({
  storeId,
  subscriptionId,
  statusId,
  subscriptionTotal,
}) => {
  const recentHistory = subscriptionHistoryCollection.findOne({
    storeId,
    subscriptionId,
  }, {
    sort: {
      timestamp: -1,
    },
  });

  const newRecord = {
    subscriptionId,
    timestamp: new Date(),
    statusId,
    storeId,
  };

  if (recentHistory) {
    newRecord.previousStatusId = recentHistory.statusId;
    newRecord.previousTimestamp = recentHistory.timestamp;
  }

  if (subscriptionTotal) {
    newRecord.subscriptionTotalWhenStatusChanged = subscriptionTotal;
  }

  subscriptionHistoryCollection.insert(newRecord);
};

// Methods
const createHistoryEntry = new ValidatedMethod({
  name: 'SubscriptionHistory.createHistoryEntry',
  validate: new SimpleSchema({
    storeId: { type: String },
    subscriptionId: { type: String },
    statusId: { type: String },
    subscriptionTotal: { type: Number, decimal: true },
  }).validator(),
  run({ storeId, subscriptionId, statusId, subscriptionTotal }) {
    check(storeId, String);
    check(subscriptionId, String);
    check(statusId, String);
    check(subscriptionTotal, Number);
    if (!this.isSimulation) {
      subscriptionHistoryCollection.createHistoryEntry({
        storeId,
        subscriptionId,
        statusId,
        subscriptionTotal,
      });
    }
  },
});

export { subscriptionHistoryCollection, createHistoryEntry };
