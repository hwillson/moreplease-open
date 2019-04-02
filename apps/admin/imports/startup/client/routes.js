import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';
import { Session } from 'meteor/session';

import '../../templates/common/layout';
import '../../templates/welcome/welcome';
import '../../templates/dashboard/dashboard';
import '../../templates/subscriptions/subscriptions';
import '../../templates/subscriptions/subscription';
import '../../templates/subscriptions/new-subscription';
import '../../templates/products/products';
import '../../templates/settings/emails';
import '../../templates/settings/store';
import '../../templates/settings/api';

const ensureLoggedIn = (context, redirect) => {
  if (!Meteor.userId()) {
    redirect('/welcome');
  }
};

FlowRouter.route('/', {
  action: () => {
    FlowRouter.go('/welcome');
  },
});

FlowRouter.route('/welcome', {
  name: 'adminWelcome',
  action: () => {
    if (Meteor.userId()) {
      FlowRouter.go('/dashboard');
    } else {
      BlazeLayout.render('adminLayout', { main: 'adminWelcome' });
    }
  },
});

FlowRouter.route('/dashboard', {
  name: 'adminDashboard',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminDashboard' });
  },
});

FlowRouter.route('/subscriptions', {
  name: 'adminSubscriptions',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminSubscriptions' });
  },
});

FlowRouter.route('/subscription', {
  name: 'adminSubscription',
  triggersEnter: [ensureLoggedIn],
  action: (params, queryParams) => {
    Session.set('subscriptionId', queryParams.id);
    BlazeLayout.render('adminLayout', { main: 'adminSubscription' });
  },
});

FlowRouter.route('/new-subscription', {
  name: 'adminNewSubscription',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminNewSubscription' });
  },
});

FlowRouter.route('/products', {
  name: 'adminProducts',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminProducts' });
  },
});

FlowRouter.route('/settings/email', {
  name: 'adminSettingsEmails',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminSettingsEmails' });
  },
});

FlowRouter.route('/settings/store', {
  name: 'adminSettingsStore',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminSettingsStore' });
  },
});

FlowRouter.route('/settings/api', {
  name: 'adminSettingsApi',
  triggersEnter: [ensureLoggedIn],
  action: () => {
    BlazeLayout.render('adminLayout', { main: 'adminSettingsApi' });
  },
});
