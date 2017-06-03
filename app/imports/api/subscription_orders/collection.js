import { Mongo } from 'meteor/mongo';

import subscriptionOrderSchema from './schema';

const subscriptionOrdersCollection = new Mongo.Collection('subscription_orders');
subscriptionOrdersCollection.attachSchema(subscriptionOrderSchema);

subscriptionOrdersCollection.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

export default subscriptionOrdersCollection;
