import { SubscriptionCustomersCollection } from 'meteor/moreplease:common';

export default (customer) => {
  const existingCustomer =
    SubscriptionCustomersCollection.findOne({
      externalId: customer.externalId,
    });
  let customerId;
  if (!existingCustomer) {
    customerId =
      SubscriptionCustomersCollection.insert(customer);
  } else {
    customerId = existingCustomer._id;
  }
  return customerId;
};
