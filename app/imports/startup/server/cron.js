import { Meteor } from 'meteor/meteor';
import { CronJob } from 'cron';

import dailySummaryEmail from '../../api/reporting/daily_summary_email';

// const emailCronConfig = Meteor.settings.private.cron.dailySummaryEmail;
// if (emailCronConfig.enabled) {
//   const job = new CronJob(emailCronConfig.schedule, () => {
//     // TODO
//   }, null, false, emailCronConfig.timezone);
//   job.start();
// }
