import { Template } from 'meteor/templating';
import { AutoForm } from 'meteor/aldeed:autoform';
import { sAlert } from 'meteor/juliancwirko:s-alert';

import {
  SubscriptionsCollection,
  StoresCollection,
} from 'meteor/moreplease:common';

import './new-subscription.html';

Template.adminNewSubscription.onCreated(function onCreated() {
  this.subscribe('store');
});

Template.adminNewSubscription.helpers({
  storeId() {
    return StoresCollection.findOne()._id;
  },

  collection() {
    return SubscriptionsCollection;
  },

  subscription() {
    return null;
  },

  type() {
    return 'method';
  },

  method() {
    return 'subscription.createSubscription';
  },

  singleMethodArgument() {
    return true;
  },

  formId() {
    return 'new-subscription';
  },
});

AutoForm.addHooks(['new-subscription'], {
  onSuccess() {
    sAlert.success('Subscription created.');
  },
});
