import { Meteor } from 'meteor/meteor';
import { ProductsCollection } from 'meteor/moreplease:common';

const productIndexes = [
  { productId: 1 },
  { variationId: 1 },
  { storeId: 1 },
];

Meteor.startup(() => {
  productIndexes.forEach((index) => {
    ProductsCollection.rawCollection().createIndex(index);
  });
});
