import { SubscriptionsCollection } from 'meteor/moreplease:common';
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

export function generateSubscriberCsv(storeId) {
  const subs = SubscriptionsCollection.find({ storeId }).map(sub => ({
    subscriptionId: sub._id,
    firstName: sub.customerFirstName,
    lastName: sub.customerLastName,
    email: sub.customerEmail,
    subscriptionStatus: sub.statusId,
    externalCustomerId:
      sub.getCustomer() ? sub.getCustomer().externalId : null,
    nextShipmentDate: sub.renewalDate,
    totalSubscriptionPrice: +sub.subscriptionTotal().toFixed(2),
    renewalFrequencyLabel: sub.renewalFrequencyLabel(),
    totalOrders: sub.totalOrders(),
    totalSpent: sub.totalSpent(),
    renewalCount: sub.renewalCount()
  }));
  const csvWriter = createCsvWriter({
    path: '/tmp/export.csv',
    header: [
      { id: 'subscriptionId', title: 'subscriptionId'},
      { id: 'firstName', title: 'firstName'},
      { id: 'lastName', title: 'lastName'},
      { id: 'email', title: 'email'},
      { id: 'subscriptionStatus', title: 'subscriptionStatus'},
      { id: 'externalCustomerId', title: 'externalCustomerId'},
      { id: 'nextShipmentDate', title: 'nextShipmentDate'},
      { id: 'totalSubscriptionPrice', title: 'totalSubscriptionPrice'},
      { id: 'renewalFrequencyLabel', title: 'renewalFrequencyLabel'},
      { id: 'totalOrders', title: 'totalOrders'},
      { id: 'totalSpent', title: 'totalSpent'},
      { id: 'renewalCount', title: 'renewalCount'},
    ]
  });
  csvWriter.writeRecords(subs).then(() => console.log('Done.'));
}