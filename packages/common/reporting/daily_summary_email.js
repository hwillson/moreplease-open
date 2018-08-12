import { moment } from 'meteor/momentjs:moment';
import { _ } from 'meteor/underscore';

import { SubscriptionsCollection } from '../domain/subscription';
import SubscriptionStatus from '../domain/subscription_status';
import { subscriptionHistoryCollection } from '../domain/subscription_history';
import { subscriptionOrdersCollection } from '../domain/subscription_order';
import email from '../utilities/email';

const dailySummaryEmail = (() => {
  const publicApi = {};
  const privateApi = {};

  /* Public API */

  publicApi.generateAndSendEmail = (storeId, emailTo) => {
    const dailySummary = {};
    if (storeId) {
      dailySummary.renewalCount =
        subscriptionOrdersCollection.currentDayRenewalCount(storeId);

      dailySummary.activeSubsMonthlyCount =
        privateApi.getActiveSubsMonthlyCount(storeId);

      dailySummary.activeSubsMonthlyRevenue =
        privateApi.getActiveSubsMonthlyRevenue(storeId);

      dailySummary.newSubsTodayCount =
        privateApi.getNewSubsTodayCount(storeId);
      dailySummary.newSubsTodayRevenue =
        privateApi.getNewSubsTodayRevenue(storeId);

      dailySummary.pausedSubsTodayCount =
        privateApi.getPausedSubsTodayCount(storeId);
      dailySummary.pausedSubsTodayRevenue =
        privateApi.getPausedSubsTodayRevenue(storeId);
      dailySummary.pausedSubsToday =
        privateApi.getPausedSubsToday(storeId);

      dailySummary.cancelledSubsTodayCount =
        privateApi.getCancelledSubsTodayCount(storeId);
      dailySummary.cancelledSubsTodayRevenue =
        privateApi.getCancelledSubsTodayRevenue(storeId);
      dailySummary.cancelledSubsToday =
        privateApi.getCancelledSubsToday(storeId);

      dailySummary.failedPaymentCount =
        privateApi.getFailedPaymentCount(storeId);
      dailySummary.failedPaymentRevenue =
        privateApi.getFailedPaymentRevenue(storeId);
      dailySummary.failedPaymentCustomersToday =
        privateApi.getFailedPaymentCustomersToday(storeId);

      const excludeSubIds =
        _.pluck(dailySummary.failedPaymentCustomersToday, 'subscriptionId');
      dailySummary.failedPaymentCustomersOngoing =
        privateApi.getFailedPaymentCustomersOngoing(storeId, excludeSubIds);

      privateApi.sendEmail(dailySummary, emailTo);
    } else {
      throw new Error('Missing storeId.');
    }
    // return dailySummary;
  };

  /* Private API */

  privateApi.getActiveSubsMonthlyCount = storeId => (
    SubscriptionsCollection.find({
      storeId,
      statusId: SubscriptionStatus.active.id,
    }).count()
  );

  privateApi.getActiveSubsMonthlyRevenue = (storeId) => {
    const activeSubs = SubscriptionsCollection.find({
      storeId,
      statusId: SubscriptionStatus.active.id,
    }).fetch();

    let monthlyRevenue = 0;
    activeSubs.forEach((sub) => {
      if (sub.renewalFrequencyId === 'w2') {
        monthlyRevenue += (sub.subscriptionTotal() * 2);
      } else if (sub.renewalFrequencyId === 'm2') {
        monthlyRevenue += (sub.subscriptionTotal() / 2);
      } else if (sub.renewalFrequencyId === 'm3') {
        monthlyRevenue += (sub.subscriptionTotal() / 3);
      } else {
        monthlyRevenue += sub.subscriptionTotal();
      }
    });
    return +monthlyRevenue.toFixed(2);
  };

  privateApi.getNewSubsTodayCount = storeId => (
    SubscriptionsCollection.find({
      storeId,
      statusId: SubscriptionStatus.active.id,
      startDate: {
        $gte: moment().subtract(1, 'day').startOf('day').toDate(),
        $lt: moment().subtract(1, 'day').endOf('day').toDate(),
      },
    }).count()
  );

  privateApi.getNewSubsTodayRevenue = (storeId) => {
    let dailyRevenue = 0;
    SubscriptionsCollection.find({
      storeId,
      statusId: SubscriptionStatus.active.id,
      startDate: {
        $gte: moment().subtract(1, 'day').startOf('day').toDate(),
        $lt: moment().subtract(1, 'day').endOf('day').toDate(),
      },
    }).forEach((subscription) => {
      dailyRevenue += subscription.subscriptionTotal();
    });
    return +dailyRevenue.toFixed(2);
  };

  privateApi.getPausedSubsTodayCount = storeId => (
    subscriptionHistoryCollection.find({
      storeId,
      statusId: SubscriptionStatus.paused.id,
      timestamp: {
        $gte: moment().subtract(1, 'day').startOf('day').toDate(),
        $lt: moment().subtract(1, 'day').endOf('day').toDate(),
      },
    }).count()
  );

  privateApi.getPausedSubsTodayRevenue = (storeId) => {
    let lostRevenue = 0;
    subscriptionHistoryCollection.find({
      storeId,
      statusId: SubscriptionStatus.paused.id,
      timestamp: {
        $gte: moment().subtract(1, 'day').startOf('day').toDate(),
        $lt: moment().subtract(1, 'day').endOf('day').toDate(),
      },
    }).forEach((historyEntry) => {
      const subscription =
        SubscriptionsCollection.findOne({ _id: historyEntry.subscriptionId });
      lostRevenue += subscription.subscriptionTotal();
    });
    return +lostRevenue.toFixed(2);
  };

  privateApi.getPausedSubsToday = storeId => (
    subscriptionHistoryCollection.find({
      storeId,
      statusId: SubscriptionStatus.paused.id,
      timestamp: {
        $gte: moment().subtract(1, 'day').startOf('day').toDate(),
        $lt: moment().subtract(1, 'day').endOf('day').toDate(),
      },
    }).map((sub) => {
      const subData =
        SubscriptionsCollection.findOne({ _id: sub.subscriptionId });
      return {
        name: subData.customerName(),
        daysSinceFirstOrder: subData.daysSinceFirstOrder(),
        renewalCount: subData.renewalCount(),
        // Represents the amount of the subscription when it was cancelled.
        total: subData.subscriptionTotal(),
      };
    })
  );

  privateApi.getCancelledSubsTodayCount = storeId => (
    subscriptionHistoryCollection.find({
      storeId,
      statusId: SubscriptionStatus.cancelled.id,
      timestamp: {
        $gte: moment().subtract(1, 'day').startOf('day').toDate(),
        $lt: moment().subtract(1, 'day').endOf('day').toDate(),
      },
    }).count()
  );

  privateApi.getCancelledSubsTodayRevenue = (storeId) => {
    let lostRevenue = 0;
    subscriptionHistoryCollection.find({
      storeId,
      statusId: SubscriptionStatus.cancelled.id,
      timestamp: {
        $gte: moment().subtract(1, 'day').startOf('day').toDate(),
        $lt: moment().subtract(1, 'day').endOf('day').toDate(),
      },
    }).forEach((historyEntry) => {
      const subscription =
        SubscriptionsCollection.findOne({ _id: historyEntry.subscriptionId });
      lostRevenue += subscription.subscriptionTotal();
    });
    return +lostRevenue.toFixed(2);
  };

  privateApi.getCancelledSubsToday = storeId => (
    subscriptionHistoryCollection.find({
      storeId,
      statusId: SubscriptionStatus.cancelled.id,
      timestamp: {
        $gte: moment().subtract(1, 'day').startOf('day').toDate(),
        $lt: moment().subtract(1, 'day').endOf('day').toDate(),
      },
    }).map((sub) => {
      const subData =
        SubscriptionsCollection.findOne({ _id: sub.subscriptionId });
      return {
        name: subData.customerName(),
        daysSinceFirstOrder: subData.daysSinceFirstOrder(),
        renewalCount: subData.renewalCount(),
        // Represents the amount of the subscription when it was cancelled.
        total: subData.subscriptionTotal(),
      };
    })
  );

  privateApi.getFailedPaymentCount = storeId => (
    SubscriptionsCollection.find({
      storeId,
      statusId: SubscriptionStatus.failed.id,
      renewalDate: {
        $gte: moment().subtract(1, 'months').startOf('day').toDate(),
      },
    }).count()
  );

  privateApi.getFailedPaymentRevenue = (storeId) => {
    let lostRevenue = 0;
    SubscriptionsCollection.find({
      storeId,
      statusId: SubscriptionStatus.failed.id,
      renewalDate: {
        $gte: moment().subtract(1, 'months').startOf('day').toDate(),
      },
    }).forEach((subscription) => {
      lostRevenue += subscription.subscriptionTotal();
    });
    return +lostRevenue.toFixed(2);
  };

  privateApi.getFailedPaymentCustomersToday = storeId => (
    subscriptionHistoryCollection.find({
      storeId,
      statusId: SubscriptionStatus.failed.id,
      timestamp: {
        $gte: moment().subtract(1, 'day').startOf('day').toDate(),
        $lt: moment().subtract(1, 'day').endOf('day').toDate(),
      },
    }).map((historyEntry) => {
      const subscription =
        SubscriptionsCollection.findOne({ _id: historyEntry.subscriptionId });
      const customer = subscription.getCustomer();
      return {
        subscriptionId: subscription._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
      };
    })
  );

  privateApi.getFailedPaymentCustomersOngoing = (storeId, excludeSubIds = []) => (
    SubscriptionsCollection.find({
      storeId,
      statusId: SubscriptionStatus.failed.id,
      renewalDate: {
        $gte: moment().subtract(1, 'months').startOf('day').toDate(),
      },
      _id: {
        $nin: excludeSubIds,
      },
    }).map((subscription) => {
      const customer = subscription.getCustomer();
      return {
        subscriptionId: subscription._id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
      };
    })
  );

  privateApi.sendEmail = (dailySummary, emailTo) => {
    if (dailySummary && emailTo) {
      let renewalWarning = '';
      if (dailySummary.renewalCount === 0) {
        renewalWarning = `
          <strong>
            WARNING: There were 0 renewals today; please verify that the
            subscription renewal process is working properly.
          </strong>
        `;
      }

      let content = `
        <h2>Monitoring (Today)</h2>
        <p>
          Subscription Renewal Orders Created Today: ${dailySummary.renewalCount}
        </p>
        ${renewalWarning}
        <h2>Summary (Yesterday)</h2>
        <p>
          <strong>Active Subscriptions</strong> <br />
          Total Count: ${dailySummary.activeSubsMonthlyCount} <br />
          Monthly Recurring Revenue: $${dailySummary.activeSubsMonthlyRevenue}
        </p>
        <p>
          <strong>New Subscriptions Today</strong> <br />
          Count: ${dailySummary.newSubsTodayCount} <br />
          Revenue: $${dailySummary.newSubsTodayRevenue}
        </p>
        <p>
          <strong>Paused Subscriptions Today</strong> <br />
          Count: ${dailySummary.pausedSubsTodayCount} <br />
          Lost Revenue: $${dailySummary.pausedSubsTodayRevenue}
        </p>
      `;

      if (dailySummary.pausedSubsToday) {
        content += '<ul>';
        dailySummary.pausedSubsToday.forEach((sub) => {
          content +=
            '<li>' +
            `${sub.name}, ` +
            `${sub.daysSinceFirstOrder} days since first order, ` +
            `${sub.renewalCount} renewals, ` +
            `$${sub.total.toFixed(2)}` +
            '</li>';
        });
        content += '</ul>';
      }

      content += `
        <p>
          <strong>Cancelled Subscriptions Today</strong> <br />
          Count: ${dailySummary.cancelledSubsTodayCount} <br />
          Lost Revenue: $${dailySummary.cancelledSubsTodayRevenue}
        </p>
      `;

      if (dailySummary.cancelledSubsToday) {
        content += '<ul>';
        dailySummary.cancelledSubsToday.forEach((sub) => {
          content +=
            '<li>' +
            `${sub.name}, ` +
            `${sub.daysSinceFirstOrder} days since first order, ` +
            `${sub.renewalCount} renewals, ` +
            `$${sub.total.toFixed(2)}` +
            '</li>';
        });
        content += '</ul>';
      }

      content += `
        <p>
          <strong>Failed Payments</strong> <br />
          Count: ${dailySummary.failedPaymentCount} <br />
          Lost Revenue: $${dailySummary.failedPaymentRevenue}
        </p>
      `;

      if (dailySummary.failedPaymentCustomersToday
          || dailySummary.failedPaymentCustomersOngoing) {
        content += '<p><strong>Failed Payment Customers:</strong>';
        [
          { label: 'Today', customers: dailySummary.failedPaymentCustomersToday },
          { label: 'On-going', customers: dailySummary.failedPaymentCustomersOngoing },
        ].forEach((details) => {
          content += `<p><strong>&nbsp;&nbsp;${details.label}</strong></p><ul>`;
          if (_.isEmpty(details.customers)) {
            content += '<li>None</li>';
          } else {
            details.customers.forEach((customer) => {
              content +=
                `<li>Subscription ID: ${customer.subscriptionId}, `
                + `First Name: ${customer.firstName}, `
                + `Last Name: ${customer.lastName}, `
                + `Email: ${customer.email} </li>`;
            });
          }
          content += '</ul>';
        });
      }

      email.sendEmail(
        emailTo,
        'do-not-reply@moreplease.io',
        'MorePlease Reporting: Daily Summary '
        + `(${moment().subtract(1, 'day').format('YYYY-MM-DD')})`,
        content,
      );
    }
  };

  return publicApi;
})();

export default dailySummaryEmail;
