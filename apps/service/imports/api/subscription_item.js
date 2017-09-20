import {
  SubscriptionsCollection,
  SubscriptionItemsCollection,
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
      const newItem = Object.assign({ subscriptionId, storeId }, item);
      SubscriptionItemsCollection.insert(newItem);
    });

    const subscription = SubscriptionsCollection.findOne({
      _id: subscriptionId,
      storeId,
    });
    subscriptionData = {
      subscription: {
        subtotal: +subscription.subscriptionSubtotal().toFixed(2),
        shipping: +subscription.shippingCost.toFixed(2),
        total: +subscription.subscriptionTotal().toFixed(2),
      },
    };
  }
  return subscriptionData;
};

export const updateSubscriptionItem = ({ storeId, itemId, itemData }) => {
  let subscriptionData;
  if (storeId && itemId && itemData) {
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

      const updatedItem =
        SubscriptionItemsCollection.findOne({ _id: itemId, storeId });
      const subscription = SubscriptionsCollection.findOne({
        _id: updatedItem.subscriptionId,
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
          shipping: +subscription.shippingCost.toFixed(2),
          total: +subscription.subscriptionTotal().toFixed(2),
        },
        subscriptionItem: {
          totalPrice: +updatedItem.totalPrice().toFixed(2),
          discountedTotalPrice: +updatedItem.totalDiscountedPrice().toFixed(2),
        },
      };
    }
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
          shipping: +subscription.shippingCost.toFixed(2),
          total: +subscription.subscriptionTotal().toFixed(2),
        },
      };
    }
  }
  return subscriptionData;
};
