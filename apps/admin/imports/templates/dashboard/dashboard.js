import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { SubscriptionMethods } from 'meteor/moreplease:common';

import './dashboard.html';

Template.adminDashboard.onCreated(function onCreated() {
  this.renewalCounts = new ReactiveVar({
    yesterday: 0,
    today: 0,
    tomorrow: 0,
  });
  this.subscriptionStatusData = new ReactiveVar([]);
});

Template.adminDashboard.onRendered(function onRendered() {
  SubscriptionMethods.getRenewalCounts.call((error, counts) => {
    if (counts) {
      this.renewalCounts.set(counts);
    }
  });

  SubscriptionMethods.getStatusCounts.call((error, counts) => {
    if (counts) {
      this.subscriptionStatusData.set(counts);
    }
  });
});

Template.adminDashboard.helpers({
  renewalCounts() {
    return Template.instance().renewalCounts.get();
  },

  subscriptionOverviewChart() {
    const instance = Template.instance();
    return {
      chart: {
        type: 'column',
      },
      title: {
        text: 'Subscription Status Overview',
      },
      subtitle: {
        text: 'Current subscription counts by status.',
      },
      xAxis: {
        type: 'category',
        title: {
          text: 'Subscription Status',
        },
      },
      yAxis: {
        title: {
          text: 'Subscription Count',
        },
      },
      legend: {
        enabled: false,
      },
      series: [{
        name: 'Subscription Status',
        colorByPoint: true,
        data: instance.subscriptionStatusData.get(),
      }],
    };
  },
});
