import { Meteor } from 'meteor/meteor';
import { SyncedCron } from 'meteor/percolate:synced-cron';
import Raven from 'raven';

// import draftOrderManager from 'meteor/moreplease:stitch';
import {
  StoresCollection,
  ProductSynch,
  SubscriptionManager,
  dailySummaryEmail,
  adminDailySummaryEmail,
} from 'meteor/moreplease:common';

Raven.config(Meteor.settings.private.sentry.dsn).install();

Meteor.startup(() => {
  // Jobs for all stores
  SyncedCron.add({
    name: 'Admin daily summary email.',
    schedule(parser) {
      return parser.text('at 9:00 am');
    },
    job() {
      adminDailySummaryEmail.generateAndSendEmail(
        Meteor.settings.private.reporting.admin,
      );
    },
  });

  StoresCollection.find().forEach((store) => {
    // Disabling all TF stores for now (will remove data soon)
    if (
      (store._id !== 'nbdTeQ5xZ2QGu7fTD') &&
      (store._id !== 'nED7bRFEMaKbApaf3')
    ) {
      // Setup product synch jobs.
      SyncedCron.add({
        name: `Product synch job for store ${store._id}`,
        schedule(parser) {
          return parser.text('every 6 hours');
        },
        job() {
          ProductSynch.fetchProductVariations(store._id);
        },
      });

      if (!store.disableRenewals) {
        // Setup subscription order renewal jobs.
        SyncedCron.add({
          name: `Subscription order renewal job for store ${store._id}`,
          schedule(parser) {
            return parser.text(`at ${store.subscriptionRenewalStartTime}`);
          },
          job() {
            const subscriptionsRenewed =
              SubscriptionManager.renewSubscriptions(store._id);
            return `Total subscriptions renewed: ${subscriptionsRenewed}`;
          },
        });

        // Setup subscription renewal reminder emails.
        SyncedCron.add({
          name: `Subscription renewal reminder email job for store ${store._id}`,
          schedule(parser) {
            return parser.text('every 24 hours');
          },
          job() {
            const emailsSent =
              SubscriptionManager.sendSubscriptionReminders(store._id);
            return `Subscription renewal reminders sent: ${emailsSent}`;
          },
        });
      }
    }

    // Special jobs just for TF
    /*
    if (store._id === 'nED7bRFEMaKbApaf3') {
      SyncedCron.add({
        name: 'Stitch "draft order" synch for TF.',
        schedule(parser) {
          return parser.text('every 4 hours');
        },
        job() {
          let draftOrderDetails = {
            createdCount: 0,
            pausedCancelledDeletedCount: 0,
            modifiedFinalizedDeletedCount: 0,
          };
          try {
            draftOrderDetails = draftOrderManager.synchDraftOrders();
          } catch (error) {
            Raven.captureException(error);
          }
          return `Draft orders created: ${draftOrderDetails.createdCount}, `
            + 'Paused/Cancelled orders deleted: '
            + `${draftOrderDetails.pausedCancelledDeletedCount}, `
            + 'Modified/Finalized orders deleted: '
            + `${draftOrderDetails.modifiedFinalizedDeletedCount}`;
        },
      });

      SyncedCron.add({
        name: 'Daily summary email for TF.',
        schedule(parser) {
          return parser.text('at 10:00 am');
        },
        job() {
          dailySummaryEmail.generateAndSendEmail(
            store._id,
            Meteor.settings.private.reporting.sales,
          );
        },
      });
    }
    */
  });

  SyncedCron.start();
});
