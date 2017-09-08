/* eslint func-names:0 */

Template.adminSettingsEmails.onCreated(function () {
  this.selectedEmailId = new ReactiveVar('');
});

// Template.adminSettingsEmails.onRendered(function () {
//   this.$('#email-test-modal').on('shown.bs.modal', () => {
//     this.$('.recipient-email').focus();
//   });
// });

Template.adminSettingsEmails.helpers({

  testEmailSchema() {
    return MorePlease.schemas.testEmail;
  },

  selectedEmailVar() {
    return Template.instance().selectedEmailId;
  },

  selectedEmailId() {
    return Template.instance().selectedEmailId.get();
  }

});

// AutoForm.addHooks('email-form', {
//   onSuccess() {
//     sAlert.success('Email settings have been saved.');
//   }
// });
//
// AutoForm.addHooks('email-test-form', {
//   onSuccess() {
//     $('#email-test-modal').modal('hide');
//     sAlert.success('Test email has been sent.');
//   }
// });
