/* global MorePlease */

import { SubscriptionsCollection } from '../domain/subscription';
import { moment } from 'meteor/momentjs:moment';

const adminDailySummaryEmail = (() => {
  const publicApi = {};
  const privateApi = {};

  /* Public API */

  publicApi.generateAndSendEmail = (emailTo) => {
    const dailySummary = {};
    dailySummary.duplicateSubscriptions =
      Promise.await(
        SubscriptionsCollection.rawCollection().aggregate([
          { $project: { statusId: 1, customerId: 1 } },
          { $match: { statusId: 'active' } },
          { $group: { _id: '$customerId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $match: { count: { $gte: 2 } } },
        ]).toArray(),
      );

    privateApi.sendEmail(dailySummary, emailTo);
    // return dailySummary;
  };

  /* Private API */

  privateApi.sendEmail = (dailySummary, emailTo) => {
    if (dailySummary && emailTo) {
      let content = '<h2>Admin Monitoring</h2>';

      const dupeSubs = dailySummary.duplicateSubscriptions;
      content += `
        <p>
          <strong>Duplicate Subscriptions</strong>
        </p>
      `;

      if (dupeSubs && dupeSubs.length > 0) {
        content += '<ul>';
        dupeSubs.forEach((dupe) => {
          content +=
            '<li>' +
            `  Customer ID: ${dupe._id}, Count: ${dupe.count}` +
            '</li>';
        });
        content += '</ul>';
      } else {
        content += 'None';
      }

      MorePlease.utilities.email.sendEmail(
        emailTo,
        'do-not-reply@moreplease.io',
        'MorePlease Reporting: Admin Daily Summary '
        + `(${moment().subtract(1, 'day').format('YYYY-MM-DD')})`,
        content,
      );
    }
  };

  return publicApi;
})();

export default adminDailySummaryEmail;
