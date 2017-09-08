import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { Meteor } from 'meteor/meteor';
import { Roles } from 'meteor/alanning:roles';
import { check } from 'meteor/check';
import { _ } from 'meteor/underscore';

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
  variationPrice: {
    type: Number,
    label: 'Variation Price',
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
    const product = Object.create(doc);
    _.extend(product, Product);
    return product;
  },
});
ProductsCollection.attachSchema(ProductSchema);
export { ProductsCollection };

ProductsCollection.findProductVariations =
  productId => ProductsCollection.find({ productId });

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
