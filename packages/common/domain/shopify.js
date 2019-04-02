import { HTTP } from 'meteor/http';

import { StoresCollection } from './store';
import StoreType from './store_type';

export function sendSubIdToShopify({
  shopifyCustomerId,
  storeId,
  subscriptionId,
}) {
  if (shopifyCustomerId && storeId && subscriptionId) {
    const store = StoresCollection.findOne({ _id: storeId });
    let webServiceUrl = store.webServiceUrl;
    if (store.storeType === StoreType.codes.shopify.id) {
      webServiceUrl += `/customers/${shopifyCustomerId}/metafields.json`;

      HTTP.call('POST', webServiceUrl, {
        auth: `${store.storeWsAuthUser}:${store.storeWsAuthPass}`,
        data: {
          metafield: {
            key: 'subscription_id',
            value: subscriptionId,
            value_type: 'string',
            namespace: 'moreplease',
          },
        },
      });
    }
  }
}
