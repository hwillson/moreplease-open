import { ProductsCollection } from 'meteor/moreplease:common';

const productIndexes = [
  { productId: 1 },
  { variationId: 1 },
  { storeId: 1 },
];

productIndexes.forEach((index) => {
  ProductsCollection.rawCollection().createIndex(index);
});
