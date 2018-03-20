import { Meteor } from 'meteor/meteor';
import {
  SubscriptionsCollection,
  ProductsCollection,
} from 'meteor/moreplease:common';

const subscriptionIndexes = [
  { storeId: 1 },
];

const productIndexes = [
  { productId: 1 },
  { variationId: 1 },
  { storeId: 1 },
];

Meteor.startup(() => {
  subscriptionIndexes.forEach((index) => {
    SubscriptionsCollection.rawCollection().createIndex(index);
  });

  productIndexes.forEach((index) => {
    ProductsCollection.rawCollection().createIndex(index);
  });
});
