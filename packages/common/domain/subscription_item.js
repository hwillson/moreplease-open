import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Mongo } from 'meteor/mongo';
import { _ } from 'meteor/underscore';
import { Session } from 'meteor/session';

import { SubscriptionsCollection } from './subscription';
import { ProductsCollection } from './product';
import subscriptionOrderType from './subscription_order_type';
import role from '../utilities/role';
import { customerDiscountsCollection } from './customer_discount';

// Schema
const SubscriptionItemSchema = new SimpleSchema({
  subscriptionId: {
    type: String,
    label: 'Subscription ID',
    optional: true,
  },
  productId: {
    type: Number,
    label: 'Product ID',
  },
  variationId: {
    type: Number,
    label: 'Variation ID',
    optional: true,
  },
  quantity: {
    type: Number,
    label: 'Quantity',
  },
  discountPercent: {
    type: Number,
    label: 'Discount Percent',
    optional: true,
    decimal: true,
  },
  storeId: {
    type: String,
    label: 'Store ID',
  },
  note: {
    type: String,
    optional: true,
  },
  locked: {
    type: Boolean,
    optional: true,
    defaultValue: false,
  },
  oneTime: {
    type: Boolean,
    optional: true,
    defaultValue: false,
  },
});

let SubscriptionItemsCollection;

// Model
const SubscriptionItem = {
  subscription() {
    return SubscriptionsCollection.findOne({
      _id: this.subscriptionId,
    });
  },

  orderType() {
    return subscriptionOrderType[this.orderTypeId].label;
  },

  orderUrl() {
    let companyRole;
    if (Meteor.isClient) {
      companyRole = Session.get('companyRole');
      if (!companyRole) {
        companyRole = role.companyRole(Meteor.userId());
      }
    } else {
      companyRole = role.companyRole(this.userId);
    }
    return Meteor.settings.public[companyRole].subscriptionOrderUrl
      + this.orderId;
  },

  remove() {
    SubscriptionItemsCollection.remove({ _id: this._id });
  },

  /**
   * If no variationId is supplied, assume there is no variant, and return
   * the matching parent product. Otherwise, try to find the matching variant
   * by variationId. If a matching variant can't be found, don't assign a
   * default product - just leave the product undefined. This fixes an issue
   * TF had where when a customer had a specific variant on their subscription
   * and that variant was removed from the master product synch, the renewal
   * would try to find the variant and instead get the default variant of the
   * main product (which in turn was a variant the customer didn't want).
   */
  productVariation() {
    let product;
    if (!this.variationId) {
      product = ProductsCollection.findOne({
        productId: this.productId,
        storeId: this.storeId,
      });
    } else {
      product = ProductsCollection.findOne({
        variationId: this.variationId,
        storeId: this.storeId,
      });
    }
    return product;
  },

  price(currency) {
    let price = 0;
    const productVariation = this.productVariation();
    if (productVariation) {
      if (currency && productVariation.variationPriceInCurrency) {
        price = productVariation.variationPriceInCurrency[currency];
      } else {
        price = productVariation.variationPrice;
      }
    }
    return price;
  },

  totalPrice(currency) {
    return this.price(currency) * this.quantity;
  },

  // Customers can have global discounts associated with their customer
  // account. If a global customer discount exists (and it's active), make
  // sure each subscription item is setup to use that global discount. If the
  // current subscription item already has a discount applied and it's less
  // than the global customer discount, replace the subscirption item discount
  // with the global discount.
  activeDiscountPercent() {
    const subscription = this.subscription();
    const customerDiscountPercent =
      customerDiscountsCollection.activeDiscountPercent({
        customerId: subscription.customerId,
        storeId: subscription.storeId,
      });

    let activeDiscountPercent = this.discountPercent;
    if (activeDiscountPercent &&
      customerDiscountPercent &&
      activeDiscountPercent < customerDiscountPercent
    ) {
      activeDiscountPercent = customerDiscountPercent;
    } else if (customerDiscountPercent && !activeDiscountPercent) {
      activeDiscountPercent = customerDiscountPercent;
    }

    return activeDiscountPercent;
  },

  totalDiscountedPrice(currency) {
    let productPrice = this.price(currency);
    if (this.activeDiscountPercent()) {
      const discount = this.activeDiscountPercent();
      productPrice = +((productPrice * ((100 - discount) / 100)).toFixed(2));
    }
    return productPrice * this.quantity;
  },

  setQuantity(quantity) {
    SubscriptionItemsCollection.update(
      { _id: this._id },
      {
        $set: {
          quantity,
        },
      },
    );
  },

  /**
   * Returns the total discounted price of the subscription item (dicounted
   * price * quantity); if no discount is available will return the total normal
   * price of the box item. Prices returned is in the specified currency.
   *
   * @param  {String}  currency  Price currency.
   * @return {Number}  Total price (price * quantity); returns discounted first,
   *                   falling back on regular price.
   */
  totalCurrentPrice(currency) {
    return this.totalDiscountedPrice(currency);
  },

  updateVariationId(variationId) {
    if (variationId && (variationId !== this.variationId)) {
      SubscriptionItemsCollection.update(
        { _id: this._id },
        {
          $set: {
            variationId,
          },
        },
      );
    }
  },
};

// Collection
SubscriptionItemsCollection = new Mongo.Collection('subscription_items', {
  transform(doc) {
    const subscriptionItem =
      Object.create(SubscriptionItem);
    _.extend(subscriptionItem, doc);
    return subscriptionItem;
  },
});
SubscriptionItemsCollection.attachSchema(SubscriptionItemSchema);

SubscriptionItemsCollection.addItem = (item) => {
  const newItem = item;
  const subscription = SubscriptionsCollection.findOne({
    _id: newItem.subscriptionId,
  });

  if (!newItem.productId) {
    const product =
      ProductsCollection.findOne({ variationId: newItem.variationId });
    newItem.productId = product.productId;
  }

  const filter = {
    subscriptionId: newItem.subscriptionId,
    productId: newItem.productId,
  };

  if (newItem.variationId) {
    filter.variationId = newItem.variationId;
  }

  let subscriptionItemId;
  const matchingSubscriptionItem = SubscriptionItemsCollection.findOne(filter);
  if (matchingSubscriptionItem) {
    matchingSubscriptionItem.setQuantity(
      matchingSubscriptionItem.quantity + newItem.quantity,
    );
    subscriptionItemId = matchingSubscriptionItem._id;
  } else {
    newItem.storeId = subscription.storeId;
    subscriptionItemId = SubscriptionItemsCollection.insert(newItem);
  }

  subscription.refreshShipping();
  return subscriptionItemId;
};

SubscriptionItemsCollection.removeProduct = (productId, variationId) => {
  let removed;
  if (productId) {
    const query = {
      productId,
    };
    if (variationId) {
      query.variationId = variationId;
    }
    removed = SubscriptionItemsCollection.remove(query);
  }
  return removed;
};

SubscriptionItemsCollection.removeOneTimeItems = (subscriptionId) => {
  SubscriptionItemsCollection.remove({ subscriptionId, oneTime: true });
};

export default SubscriptionItemsCollection;
