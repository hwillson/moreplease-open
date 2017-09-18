import { Template } from 'meteor/templating';

import { apiKeysCollection } from 'meteor/moreplease:common';

import './api.html';

Template.adminSettingsApi.onCreated(function onCreated() {
  this.subscribe('apiKeys');
});

const getApiKeys = () => apiKeysCollection.find();

Template.adminSettingsApi.helpers({
  apiKeysExist() {
    return getApiKeys().count();
  },

  apiKeys() {
    return getApiKeys();
  },
});
