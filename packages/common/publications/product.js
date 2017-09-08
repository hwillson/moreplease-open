/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { ReactiveTable } from 'meteor/aslagle:reactive-table';

import { StoresCollection } from '../domain/store';
import { ProductsCollection } from '../domain/product';
import SubscriptionItemsCollection from '../domain/subscription_item';
import { accountsCollection } from '../domain/account';

Meteor.publish('products', function products(storeId) {
  let cursor;
  check(storeId, String);
  if (this.userId) {
    const user = Meteor.users.findOne({ _id: this.userId });
    if (accountsCollection.hasStoreAccess(
      user.accountId,
      storeId,
    )) {
      cursor = ProductsCollection.find({ storeId });
    }
  } else {
    cursor = ProductsCollection.find({ storeId });
  }
  return cursor;
});

Meteor.publish(
  'productsForSubscription',
  function productsForSubscription(subscriptionId) {
    check(subscriptionId, String);
    const subItems = SubscriptionItemsCollection.find({
      subscriptionId,
    });
    const productIds = [];
    subItems.forEach((subItem) => {
      productIds.push(subItem.productId);
    });
    return ProductsCollection.find({
      productId: {
        $in: productIds,
      },
    });
  },
);

ReactiveTable.publish(
  'productsTable',
  ProductsCollection,
  function productsTable() {
    const user = Meteor.users.findOne({ _id: this.userId });
    const store = StoresCollection.findOne({ accountId: user.accountId });
    return {
      storeId: store._id,
    };
  },
);
