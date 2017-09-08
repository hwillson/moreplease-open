import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { apiKeysCollection } from './api_key';

const apiAccess = {
  findStoreIdForApiKey(key) {
    let storeId;
    if (key) {
      const apiKey = apiKeysCollection.findOne({ key });
      if (apiKey) {
        storeId = apiKey.storeId;
      }
    }
    return storeId;
  },
};
export default apiAccess;

Meteor.methods({
  findStoreIdForApiKey(key) {
    check(key, String);
    return apiAccess.findStoreIdForApiKey(key);
  },
});
