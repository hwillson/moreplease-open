import {
  SubscriptionsCollection,
  SubscriptionItemsCollection,
  customerDiscountsCollection,
  SubscriptionCustomersCollection,
} from 'meteor/moreplease:common';

export const createSubscriptionItem = ({
  storeId,
  subscriptionId,
  subscriptionItems,
  replace,
}) => {
  let subscriptionData;
  if (storeId && subscriptionId && Array.isArray(subscriptionItems)) {
    if (replace) {
      SubscriptionItemsCollection.remove({
        subscriptionId,
        storeId,
      });
    }

    subscriptionItems.forEach((item) => {
      if (item.customerDiscount) {
        // If the incoming subscription item represents a customer discount
        // instead of an actual product, extract the discount and save it in
        // the customer discount collection.
        const customer =
          SubscriptionCustomersCollection.findOne({ subscriptionId, storeId });
        customerDiscountsCollection.createNewDiscount({
          customerId: customer._id,
          storeId,
          durationMonths: 12, // Hard coding to 12 months for now
          discountPercent: item.customerDiscount,
        });
      } else {
        const newItem = Object.assign({ subscriptionId, storeId }, item);
        SubscriptionItemsCollection.insert(newItem);
      }
    });

    const subscription = SubscriptionsCollection.findOne({
      _id: subscriptionId,
      storeId,
    });
    subscriptionData = {
      subscription: {
        subtotal: +subscription.subscriptionSubtotal().toFixed(2),
        shipping:
          subscription.shippingCost ? +subscription.shippingCost.toFixed(2) : 0,
        total: +subscription.subscriptionTotal().toFixed(2),
      },
    };
  }
  return subscriptionData;
};

export const updateSubscriptionItem = ({ storeId, itemId, itemData }) => {
  let subscriptionData;
  if (storeId && itemId && itemData) {
    const updatedItem =
      SubscriptionItemsCollection.findOne({ _id: itemId, storeId });
    const subscription = SubscriptionsCollection.findOne({
      _id: updatedItem.subscriptionId,
      storeId,
    });

    if (itemData.customerDiscount) {
      // If the incoming subscription item represents a customer discount
      // instead of an actual product, extract the discount and save it in
      // the customer discount collection.
      const customer = SubscriptionCustomersCollection.findOne({
        subscriptionId: subscription._id,
        storeId,
      });
      customerDiscountsCollection.createNewDiscount({
        customerId: customer._id,
        storeId,
        durationMonths: 12, // Hard coding to 12 months for now
        discountPercent: itemData.customerDiscount,
      });
    } else {
      const updateData = {};
      if (itemData.variationId) {
        updateData.variationId = itemData.variationId;
      }
      if (itemData.quantity) {
        updateData.quantity = itemData.quantity;
      }
      if (itemData.discountPercent) {
        updateData.discountPercent = itemData.discountPercent;
      }
      if (Object.keys(updateData).length) {
        SubscriptionItemsCollection.update({
          _id: itemId,
          storeId,
        }, {
          $set: updateData,
        });

        // If making changes and an associated draft order exists, flag that
        // draft order changes are required.
        if (subscription.draftOrderId) {
          SubscriptionsCollection.update({
            _id: subscription._id,
          }, {
            $set: {
              draftOrderChanges: true,
            },
          });
        }
      }
    }

    subscriptionData = {
      subscription: {
        subtotal: +subscription.subscriptionSubtotal().toFixed(2),
        shipping:
          subscription.shippingCost ? +subscription.shippingCost.toFixed(2) : 0,
        total: +subscription.subscriptionTotal().toFixed(2),
      },
      subscriptionItem: {
        totalPrice: +updatedItem.totalPrice().toFixed(2),
        discountedTotalPrice: +updatedItem.totalDiscountedPrice().toFixed(2),
      },
    };
  }

  return subscriptionData;
};

export const deleteSubscriptionItem = ({ storeId, itemId }) => {
  let subscriptionData;
  if (storeId && itemId) {
    const subscriptionItem =
      SubscriptionItemsCollection.findOne({ _id: itemId, storeId });
    if (subscriptionItem) {
      SubscriptionItemsCollection.remove({ _id: itemId, storeId });
      const subscription = SubscriptionsCollection.findOne({
        _id: subscriptionItem.subscriptionId,
        storeId,
      });

      // If making changes and an associated draft order exists, flag that
      // draft order changes are required.
      if (subscription.draftOrderId) {
        SubscriptionsCollection.update({
          _id: subscription._id,
        }, {
          $set: {
            draftOrderChanges: true,
          },
        });
      }

      subscriptionData = {
        subscription: {
          subtotal: +subscription.subscriptionSubtotal().toFixed(2),
          shipping:
            subscription.shippingCost ? +subscription.shippingCost.toFixed(2) : 0,
          total: +subscription.subscriptionTotal().toFixed(2),
        },
      };
    }
  }
  return subscriptionData;
};
