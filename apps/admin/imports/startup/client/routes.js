import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { Session } from 'meteor/session';

import '../../templates/common/layout';
import '../../templates/welcome/welcome';
import '../../templates/dashboard/dashboard';
import '../../templates/subscriptions/subscriptions';
import '../../templates/subscriptions/subscription';

FlowRouter.route('/');

const ensureLoggedIn = (context, redirect) => {
  if (!Meteor.userId()) {
    redirect('/admin/welcome');
  }
};

FlowRouter.route('/admin', {
  action: () => {
    FlowRouter.go('/admin/welcome');
  },
});

FlowRouter.route('/admin/welcome', {
  name: 'adminWelcome',
  action: () => {
    if (Meteor.userId()) {
      FlowRouter.go('/admin/dashboard');
    } else {
      BlazeLayout.render('adminLayout', { main: 'adminWelcome' });
    }
  },
});

FlowRouter.route('/admin/dashboard', {
  name: 'adminDashboard',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminDashboard' });
  },
});

FlowRouter.route('/admin/subscriptions', {
  name: 'adminSubscriptions',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminSubscriptions' });
  },
});

FlowRouter.route('/admin/subscription', {
  name: 'adminSubscription',
  triggersEnter: [ensureLoggedIn],
  action: (params, queryParams) => {
    Session.set('subscriptionId', queryParams.id);
    BlazeLayout.render('adminLayout', { main: 'adminSubscription' });
  },
});

FlowRouter.route('/admin/products', {
  name: 'adminProducts',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminProducts' });
  },
});

FlowRouter.route('/admin/settings/api', {
  name: 'adminSettingsApi',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminSettingsApi' });
  },
});

FlowRouter.route('/admin/settings/store', {
  name: 'adminSettingsStore',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminSettingsStore' });
  },
});

FlowRouter.route('/admin/settings/email', {
  name: 'adminSettingsEmails',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminSettingsEmails' });
  },
});
