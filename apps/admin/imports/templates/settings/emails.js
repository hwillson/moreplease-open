import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { emailTestSchema } from 'meteor/moreplease:common';

import './emails.html';
import './email';

Template.adminSettingsEmails.onCreated(function onCreated() {
  this.selectedEmailId = new ReactiveVar('');
});

Template.adminSettingsEmails.helpers({
  testEmailSchema() {
    return emailTestSchema;
  },

  selectedEmailVar() {
    return Template.instance().selectedEmailId;
  },

  selectedEmailId() {
    return Template.instance().selectedEmailId.get();
  },
});
