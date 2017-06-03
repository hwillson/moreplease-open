import { Mongo } from 'meteor/mongo';

import subscriptionSchema from './schema';

const subscriptionsCollection = new Mongo.Collection('subscriptions');
subscriptionsCollection.attachSchema(subscriptionSchema);

subscriptionsCollection.deny({
  insert() { return true; },
  update() { return true; },
  remove() { return true; },
});

export default subscriptionsCollection;
