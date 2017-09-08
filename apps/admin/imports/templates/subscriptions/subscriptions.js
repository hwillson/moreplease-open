import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { SubscriptionStatus, date } from 'meteor/moreplease:common';

import './subscriptions.html';

Template.adminSubscriptions.helpers({
  settings() {
    return {
      collection: 'subscriptionsTable',
      fields: [
        {
          key: '_id',
          label: 'Subscription ID',
        },
        {
          key: 'statusId',
          label: 'Status',
          fn(value) {
            let label;
            if (value) {
              label = SubscriptionStatus[value].label;
            }
            return label;
          },
        },
        {
          key: 'customerFirstName',
          label: 'Customer First Name',
        },
        {
          key: 'customerLastName',
          label: 'Customer Last Name',
        },
        {
          key: 'customerEmail',
          label: 'Customer Email',
        },
        {
          key: 'startDate',
          label: 'Start Date',
          sortOrder: 0,
          sortDirection: 'descending',
          fn(value) {
            return date.formatDate(value);
          },
        },
        {
          key: 'renewalDate',
          label: 'Next Renewal Date',
          fn(value) {
            return date.formatDate(value);
          },
        },
      ],
    };
  },
});

Template.adminSubscriptions.events({
  'click tbody tr'() {
    FlowRouter.go(`/admin/subscription?id=${this._id}`);
  },
});
