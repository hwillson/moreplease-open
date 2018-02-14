import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import Raven from 'raven';

Raven.config(Meteor.settings.private.sentry.dsn).install();

const STITCH_ACCESS_TOKEN = Meteor.settings.private.stitch.accessToken;
if (!STITCH_ACCESS_TOKEN) {
  throw new Error('Missing Stitch access token.');
}

const STITCH_CONTACT_ID = Meteor.settings.private.stitch.contactId;
if (!STITCH_CONTACT_ID) {
  throw new Error('Missing Stitch contact ID.');
}

const stitchApi = {
  baseUrl: 'https://api-pub.stitchlabs.com/api2',
  accessToken: STITCH_ACCESS_TOKEN,
  contactId: STITCH_CONTACT_ID,

  createDraftOrder(subscriptionId, lineItems) {
    let orderId;
    if (subscriptionId && Array.isArray(lineItems) && lineItems.length > 0) {
      const response = HTTP.post(`${this.baseUrl}/v1/SalesOrders`, {
        headers: this.headers(),
        data: {
          action: 'write',
          SalesOrders: [{
            draft: 1,
            exclude_stock_tracking: 0,
            notes: `Subscription ID: ${subscriptionId}`,
            links: {
              Contacts: [{
                id: stitchApi.contactId,
              }],
              LineItems: lineItems,
            },
          }],
        },
      });

      const salesOrders = response.data.SalesOrders;
      if (salesOrders.length > 0) {
        orderId = salesOrders[0].id;
      }
    }

    return orderId;
  },

  updateDraftOrder(draftOrderId, lineItems) {
    if (draftOrderId && Array.isArray(lineItems) && lineItems.length > 0) {
      HTTP.post(`${this.baseUrl}/v1/SalesOrders`, {
        headers: this.headers(),
        data: {
          action: 'write',
          SalesOrders: [{
            id: draftOrderId,
            links: {
              LineItems: lineItems,
            },
          }],
        },
      });
    }
  },

  deleteDraftOrder(draftOrderId) {
    if (draftOrderId) {
      HTTP.post(`${this.baseUrl}/v1/SalesOrders`, {
        headers: this.headers(),
        data: {
          action: 'write',
          SalesOrders: [{
            id: draftOrderId,
            delete: 1,
          }],
        },
      });
    }
  },

  getVariantIdsForSkus(skus) {
    const variantIdsBySku = {};
    if (Array.isArray(skus) && skus.length > 0) {
      const skuOr = skus.map(sku => ({ sku }));
      const response = HTTP.post(`${this.baseUrl}/v2/Variants`, {
        headers: this.headers(),
        data: {
          action: 'read',
          filter: {
            or: skuOr,
          },
        },
      });
      const variants = response.data.Variants;
      if (Array.isArray(variants)) {
        variants.forEach((variant) => {
          if (variant.id) {
            variantIdsBySku[variant.sku] = variant.id;
          }
        });
      }
    }
    return variantIdsBySku;
  },

  headers() {
    return {
      'Content-Type': 'application/json;charset=UTF-8',
      access_token: stitchApi.accessToken,
    };
  },
};

export default stitchApi;
