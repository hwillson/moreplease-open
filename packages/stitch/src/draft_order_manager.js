import { Meteor } from 'meteor/meteor';
import { moment } from 'meteor/momentjs:moment';
import Raven from 'raven';

import { SubscriptionsCollection } from 'meteor/moreplease:common';
import stitchApi from './stitch_api';

Raven.config(Meteor.settings.private.sentry.dsn).install();

const draftOrderManager = (() => {
  const publicApi = {};
  const privateApi = {};

  /* Public API */

  publicApi.synchDraftOrders = () => ({
    pausedCancelledDeletedCount: privateApi.deletePausedCancelledDraftOrders(),
    modifiedFinalizedDeletedCount: privateApi.deleteModifiedFinalizedDraftOrders(),
    createdCount: privateApi.createReadyDraftOrders(),
  });

  /* Private API */

  privateApi.storeId = 'nED7bRFEMaKbApaf3';

  privateApi.createReadyDraftOrders = () => {
    // Find all subscriptions that don't currently have an associated draft
    // order ID, that are renewing in less than 15 days.
    const subsReady = privateApi.subsReadyForDraftOrders();

    // For each subscription that is renewing soon, create a draft order
    // in Stitch with all subscription items, then update the subscription
    // with the newly created draft order ID.
    let createdCount = 0;
    subsReady.forEach((subscription) => {
      const lineItems = privateApi.buildOrderLineItems(subscription);
      if (lineItems.length > 0) {
        const draftOrderId =
          stitchApi.createDraftOrder(subscription._id, lineItems);
        privateApi.updateSubWithDraftOrderId(subscription._id, draftOrderId);
        createdCount += 1;
      }
    });
    return createdCount;
  };

  privateApi.deletePausedCancelledDraftOrders = () => {
    let deletedCount = 0;
    SubscriptionsCollection.find({
      storeId: privateApi.storeId,
      statusId: {
        $in: ['paused', 'cancelled'],
      },
      draftOrderId: {
        $ne: null,
      },
    }).forEach((subscription) => {
      stitchApi.deleteDraftOrder(subscription.draftOrderId);
      SubscriptionsCollection.update({
        _id: subscription._id,
      }, {
        $set: { draftOrderId: null },
      });
      deletedCount += 1;
    });
    return deletedCount;
  };

  privateApi.deleteModifiedFinalizedDraftOrders = () => {
    let deletedCount = 0;
    SubscriptionsCollection.find({
      storeId: privateApi.storeId,
      statusId: 'active',
      draftOrderId: {
        $ne: null,
      },
      draftOrderChanges: true,
    }).forEach((subscription) => {
      stitchApi.deleteDraftOrder(subscription.draftOrderId);
      SubscriptionsCollection.update({
        _id: subscription._id,
      }, {
        $set: {
          draftOrderId: null,
          draftOrderChanges: false,
        },
      });
      deletedCount += 1;
    });
    return deletedCount;
  };

  privateApi.subsReadyForDraftOrders = () => {
    const subsReady = [];
    SubscriptionsCollection.find({
      storeId: privateApi.storeId,
      statusId: 'active',
      draftOrderId: null,
    }).forEach((subscription) => {
      const daysToRenewal =
        moment(subscription.renwalDate).diff(moment(), 'days');
      if (daysToRenewal <= 15) {
        subsReady.push(subscription);
      }
    });
    return subsReady;
  };

  privateApi.buildOrderLineItems = (subscription) => {
    const lineItems = [];
    if (subscription) {
      const variantDataBySku = {};
      subscription.getSubscriptionItems().forEach((subscriptionItem) => {
        const variation = subscriptionItem.productVariation();
        variantDataBySku[variation.variationSku] = {
          description: variation.productName,
          quantity: subscriptionItem.quantity,
          price: variation.variationPrice,
        };
      });

      const skus = Object.keys(variantDataBySku);
      const variantIdsBySku = stitchApi.getVariantIdsForSkus(skus);

      skus.forEach((sku) => {
        const variantId = variantIdsBySku[sku];
        if (variantId) {
          const lineItem = Object.assign({
            links: {
              Variants: [{ id: variantId }],
            },
          }, variantDataBySku[sku]);
          lineItems.push(lineItem);
        }
      });
    }
    return lineItems;
  };

  privateApi.updateSubWithDraftOrderId = (subscriptionId, draftOrderId) => {
    if (draftOrderId) {
      SubscriptionsCollection.update({
        _id: subscriptionId,
      }, {
        $set: { draftOrderId },
      });
    }
  };

  return publicApi;
})();

export default draftOrderManager;
