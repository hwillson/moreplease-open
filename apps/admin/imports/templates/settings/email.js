import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { $ } from 'meteor/jquery';
import { AutoForm } from 'meteor/aldeed:autoform';
import { sAlert } from 'meteor/juliancwirko:s-alert';

import {
  emailsCollection,
  emailType as emailCategoryType,
  StoresCollection,
} from 'meteor/moreplease:common';

import './email.html';

const getEmail = emailType => emailsCollection.findOne({ emailType });

const getFormId = emailType => `email-form-${emailType}`;

Template.adminSettingsEmail.onCreated(function onCreated() {
  this.previewContent = new ReactiveVar('');
  this.subscribe('userData');
  this.subscribe('store');
  this.subscribe('email', this.data.emailType);
});

Template.adminSettingsEmail.onRendered(function onRendered() {
  this.autorun(() => {
    if (this.subscriptionsReady()) {
      Meteor.defer(() => {
        this.previewContent.set(this.$('textarea').val());
      });
    }
  });

  this.$('#email-test-modal').on('shown.bs.modal', () => {
    this.$('.recipient-email').focus();
  });
});

Template.adminSettingsEmail.helpers({
  storeId() {
    return StoresCollection.findOne()._id;
  },

  collection() {
    return emailsCollection;
  },

  email() {
    return getEmail(this.emailType);
  },

  type() {
    return getEmail(this.emailType) ? 'method-update' : 'method';
  },

  method() {
    return getEmail(this.emailType)
      ? 'MorePlease.methods.email.update'
      : 'MorePlease.methods.email.create';
  },

  singleMethodArgument() {
    return getEmail(this.emailType);
  },

  emailType() {
    return this.emailType;
  },

  emailTitle() {
    let emailTitle;
    if (this.emailType === emailCategoryType.reminder.id) {
      emailTitle = 'Renewal Reminder Email';
    } else if (this.emailType === emailCategoryType.paymentFailed.id) {
      emailTitle = 'Payment Failed Email';
    }
    return emailTitle;
  },

  emailDescription() {
    let emailDescription;
    if (this.emailType === emailCategoryType.reminder.id) {
      emailDescription =
        'This email will be sent to customers <strong>5 days</strong> before '
        + 'their subscription renews.';
    } else if (this.emailType === emailCategoryType.paymentFailed.id) {
      emailDescription =
        'This email will be sent to customers immediately after a renewal '
        + 'payment has failed (it will only be sent once).';
    }
    return emailDescription;
  },

  formId() {
    return getFormId(this.emailType);
  },

  previewContent() {
    return Template.instance().previewContent.get();
  },
});

Template.adminSettingsEmail.events({
  'keyup textarea'(event, templateInstance) {
    templateInstance.previewContent.set($(event.currentTarget).val());
  },

  'click .js-test-email'(event, templateInstance) {
    const email = getEmail(templateInstance.data.emailType);
    templateInstance.data.selectedEmailVar.set(email._id);
  },
});

AutoForm.addHooks(['email-form-reminder', 'email-form-paymentFailed'], {
  onSuccess() {
    sAlert.success('Email settings have been saved.');
  },
});

AutoForm.addHooks('email-test-form', {
  onSuccess() {
    $('#email-test-modal').modal('hide');
    sAlert.success('Test email has been sent.');
  },
});
