/* eslint func-names:0 */

Template.adminSettingsApi.onCreated(function () {
  this.subscribe('apiKeys');
});

const getApiKeys = () => {
  return MorePlease.collections.apiKeys.find();
};

Template.adminSettingsApi.helpers({

  apiKeysExist: () => {
    return getApiKeys().count();
  },

  apiKeys: () => {
    return getApiKeys();
  }

});
