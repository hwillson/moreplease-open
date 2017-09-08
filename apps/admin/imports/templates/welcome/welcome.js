import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { $ } from 'meteor/jquery';

import './welcome.html';

Template.adminWelcome.onCreated(function onCreated() {
  this.autorun(() => {
    if (Meteor.userId()) {
      FlowRouter.go('adminDashboard');
    }
  });
});

Template.adminWelcome.events({
  'click .login'(event) {
    event.stopPropagation();
    $('.dropdown-toggle').dropdown('toggle');
    $('#login-email').focus();
  },
});
