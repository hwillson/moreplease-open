/* eslint func-names:0 */

const getStore = () => {
  return MorePlease.collections.stores.findOne();
};

Template.adminSettingsStore.onCreated(function () {
  this.subscribe('userData');
  this.subscribe('account');
  this.subscribe('store');
});

Template.adminSettingsStore.helpers({

  collection() {
    return MorePlease.collections.stores;
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
    return getStore() ? true : false;
  }

});

AutoForm.addHooks('store-form', {
  onSuccess() {
    sAlert.success('Store settings have been saved.');
    MorePlease.methods.account.addStoreId.call({ storeId: getStore()._id });
  }
});
