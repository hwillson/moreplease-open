import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/alanning:roles';
import { check } from 'meteor/check';

import SubscriptionItemsCollection from './subscription_item';

// Schema
const ProductSchema = new SimpleSchema({
  productId: {
    type: Number,
    label: 'Product ID',
  },
  productUrl: {
    type: String,
    label: 'Product URL',
  },
  productName: {
    type: String,
    label: 'Product Name',
  },
  productImage: {
    type: String,
    label: 'Product Image',
    optional: true,
  },
  variationId: {
    type: Number,
    label: 'Variation ID',
    optional: true,
  },
  variationName: {
    type: String,
    label: 'Variation Name',
    optional: true,
  },
  // `variationPrice` is always the current price. That means it could have
  // a discount already applied by the source store, if a product is on
  // sale.
  variationPrice: {
    type: Number,
    label: 'Variation Current Price',
    optional: true,
    decimal: true,
  },
  // `variationRetailPrice` is the original (non-discounted) price of a
  // product.
  variationRetailPrice: {
    type: Number,
    label: 'Variation Retail (Original) Price',
    optional: true,
    decimal: true,
  },
  // `variationSalePrice` is the sale price of a product.
  variationSalePrice: {
    type: Number,
    label: 'Variation Sale Price',
    optional: true,
    decimal: true,
  },
  'variationPriceInCurrency.USD': {
    type: Number,
    label: 'Variation Price - USD',
    optional: true,
    decimal: true,
  },
  'variationPriceInCurrency.GBP': {
    type: Number,
    label: 'Variation Price - GBP',
    optional: true,
    decimal: true,
  },
  'variationPriceInCurrency.EUR': {
    type: Number,
    label: 'Variation Price - EUR',
    optional: true,
    decimal: true,
  },
  variationSku: {
    type: String,
    optional: true,
  },
  storeId: {
    type: String,
    label: 'Store ID',
  },
});

// Model
const Product = {
  isFreeTrialProduct() {
    return this.variationSku && this.variationSku.startsWith('TF_PACK_');
  },
};

// Collection
const ProductsCollection = new Mongo.Collection('products', {
  transform(doc) {
    return { ...doc, ...Product };
  },
});
ProductsCollection.attachSchema(ProductSchema);
export { ProductsCollection };

ProductsCollection.findProductVariations =
  productId => ProductsCollection.find({ productId });

ProductsCollection.filterNonMatchingSubItems = (storeId, subItems) => {
  const productIdToSubItems = {};
  const productIds = new Set();
  const variationIdToSubItems = {};
  const variationIds = new Set();

  subItems.forEach((subItem) => {
    const variationId = subItem.variationId;
    if (variationId) {
      variationIds.add(variationId);
      if (variationIdToSubItems[variationId]) {
        variationIdToSubItems[variationId].push(subItem);
      } else {
        variationIdToSubItems[variationId] = [subItem];
      }
    } else {
      const productId = subItem.productId;
      productIds.add(productId);
      if (productIdToSubItems[productId]) {
        productIdToSubItems[productId].push(subItem);
      } else {
        productIdToSubItems[productId] = [subItem];
      }
    }
  });

  const matchingSubItems = [];
  ProductsCollection.find({
    storeId,
    $or: [
      { variationId: { $in: Array.from(variationIds) } },
      { productId: { $in: Array.from(productIds) } },
    ],
  }).forEach((product) => {
    const tmpSubItems =
      variationIdToSubItems[product.variationId] ||
      productIdToSubItems[product.productId];
    tmpSubItems.forEach((subItem) => {
      // subItem.loadedProductVariation = product;
      matchingSubItems.push(Object.assign(
        subItem,
        { loadedProductVariation: product },
      ));
    });
  });
  return matchingSubItems;
};

// Methods
const ProductMethods = {
  synchProducts: new ValidatedMethod({
    name: 'MorePlease.methods.product.synchProducts',
    validate: new SimpleSchema({
      storeId: { type: String },
    }).validator(),
    run({ storeId }) {
      if (!this.isSimulation) {
        if (this.userId && Roles.userIsInRole(this.userId, 'mp-admin')) {
          // import ProductSynch from '../../server/manage/product_synch';
          // ProductSynch.fetchProductVariations(storeId);
        } else {
          throw new Meteor.Error('You are not authorized to run this method.');
        }
      }
    },
  }),
};
export { ProductMethods };

Meteor.methods({
  removeProductFromSubscriptions(productId, variationId) {
    check(productId, Number);
    if (variationId) {
      check(variationId, Number);
    }
    if (this.userId && !this.isSimulation) {
      SubscriptionItemsCollection.removeProduct(
        productId,
        variationId
      );
    }
  },
});
