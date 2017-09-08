/* eslint func-names:0 */

const getEmail = (emailType) => {
  return MorePlease.collections.emails.findOne({
    emailType
  });
};

const getFormId = (emailType) => {
  return 'email-form-' + emailType;
};

Template.adminSettingsEmail.onCreated(function () {
  this.previewContent = new ReactiveVar('');
  this.subscribe('userData');
  this.subscribe('store');
  this.subscribe('email', this.data.emailType);
});

Template.adminSettingsEmail.onRendered(function () {

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
    return MorePlease.collections.stores.findOne()._id;
  },

  collection() {
    return MorePlease.collections.emails;
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
    return getEmail(this.emailType) ? true : false;
  },

  emailType() {
    return this.emailType;
  },

  emailTitle() {
    let emailTitle;
    if (this.emailType === MorePlease.models.emailType.reminder.id) {
      emailTitle = 'Renewal Reminder Email';
    } else if (this.emailType ===
        MorePlease.models.emailType.paymentFailed.id) {
      emailTitle = 'Payment Failed Email';
    }
    return emailTitle;
  },

  emailDescription() {
    let emailDescription;
    if (this.emailType === MorePlease.models.emailType.reminder.id) {
      emailDescription =
        'This email will be sent to customers <strong>5 days</strong> before '
        + 'their subscription renews.';
    } else if (this.emailType ===
        MorePlease.models.emailType.paymentFailed.id) {
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
  }

});

Template.adminSettingsEmail.events({

  'keyup textarea'(event, instance) {
    instance.previewContent.set($(event.currentTarget).val());
  },

  'click .js-test-email'(event, instance) {
    const email = getEmail(instance.data.emailType);
    instance.data.selectedEmailVar.set(email._id);
  }

});

AutoForm.addHooks(['email-form-reminder', 'email-form-paymentFailed'], {
  onSuccess() {
    sAlert.success('Email settings have been saved.');
  }
});

AutoForm.addHooks('email-test-form', {
  onSuccess() {
    $('#email-test-modal').modal('hide');
    sAlert.success('Test email has been sent.');
  }
});
