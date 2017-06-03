import subscriptionsCollection from '../subscriptions/collection';
import subscriptionOrdersCollection from '../subscription_orders/collection';
import subscriptionStatus from '../subscription_status/subscription_status';

const dailySummaryEmail = (() => {
  const publicApi = {};
  const privateApi = {};

  /* Public API */

  publicApi.generateAndSendEmail = async (storeId) => {
    const dailySummary = {};
    if (storeId) {
      dailySummary.activeSubsTotalCount =
        privateApi.getActiveSubsTotalCount(storeId);
      dailySummary.activeSubsTotalRevenue =
        await privateApi.getActiveSubsTotalRevenue(storeId);
      dailySummary.cancelledSubsTotalCount =
        privateApi.getCancelledSubsTotalCount(storeId);
    } else {
      throw new Error('Missing storeId.');
    }
    return dailySummary;
  };

  /* Private API */

  privateApi.getActiveSubsTotalCount = storeId => (
    subscriptionsCollection.find({
      storeId,
      statusId: subscriptionStatus.active.id,
    }).count()
  );

  privateApi.getActiveSubsTotalRevenue = storeId => (
    new Promise((resolve, reject) => {
      let totalRevenue = 0;
      subscriptionOrdersCollection.rawCollection().aggregate([
        {
          $lookup: {
            from: 'subscriptions',
            localField: 'subscriptionId',
            foreignField: '_id',
            as: 'subscription',
          },
        },
      ]).forEach((order) => {
        if ((order.storeId === storeId)
            && (order.subscription[0].statusId === subscriptionStatus.active.id)
            && order.totalPrice) {
          totalRevenue += order.totalPrice;
        }
      }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(totalRevenue);
        }
      });
    })
  );

  privateApi.getCancelledSubsTotalCount = storeId => (
    subscriptionsCollection.find({
      storeId,
      statusId: subscriptionStatus.cancelled.id,
    }).count()
  );

  return publicApi;
})();

export default dailySummaryEmail;
