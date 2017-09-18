import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { sAlert } from 'meteor/juliancwirko:s-alert';
import { AutoForm } from 'meteor/aldeed:autoform';

import { StoresCollection, addStoreId } from 'meteor/moreplease:common';

import './store.html';

const getStore = () => StoresCollection.findOne();

Template.adminSettingsStore.onCreated(function onCreated() {
  this.subscribe('userData');
  this.subscribe('account');
  this.subscribe('store');
});

Template.adminSettingsStore.helpers({
  collection() {
    return StoresCollection;
  },

  accountId() {
    return Meteor.user().accountId;
  },

  store() {
    return getStore();
  },

  type() {
    return getStore() ? 'method-update' : 'method';
  },

  method() {
    return getStore()
      ? 'MorePlease.methods.store.update'
      : 'MorePlease.methods.store.create';
  },

  singleMethodArgument() {
    return getStore() !== undefined;
  },
});

AutoForm.addHooks('store-form', {
  onSuccess() {
    sAlert.success('Store settings have been saved.');
    addStoreId.call({ storeId: getStore()._id });
  },
});
