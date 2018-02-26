import moment from 'moment';

import { createSubscription } from './subscription';
import {
  SubscriptionsCollection,
  SubscriptionItemsCollection,
  SubscriptionStatus,
  date,
  apiAccess,
} from 'meteor/moreplease:common';

export function addToSubscription(data) {
  return SubscriptionItemsCollection.addItem(data);
}

export function subscriptionRenewalDateAndStatus(data) {
  const response = {};
  if (data.subscriptionId) {
    const subscription =
      SubscriptionsCollection.findOne({ _id: data.subscriptionId });
    if (subscription) {
      response.renewalDate = date.formatLongDate(subscription.renewalDate);
      response.status = SubscriptionStatus[subscription.statusId].label;
    }
  }
  return response;
}

export function subscriptionRenewalDayCount(data) {
  let renewalDays;
  if (data.subscriptionId) {
    const subscription = SubscriptionsCollection.findOne({
      _id: data.subscriptionId,
    });
    if (subscription) {
      renewalDays = moment(subscription.renewalDate).diff(moment(), 'days');
    }
  }
  return renewalDays;
}

export function createNewSubscription(subscriptionData) {
  const storeId = apiAccess.findStoreIdForApiKey(subscriptionData.apiKey);
  return createSubscription({ storeId, subscriptionData });
}
