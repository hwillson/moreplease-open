import { SubscriptionCustomersCollection } from 'meteor/moreplease:common';

export const createCustomer = (customer) => {
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

export const updateCustomer = (customer) => {
  if (customer &&
    customer.storeId &&
    customer.externalId &&
    customer.stripeCustomerId
  ) {
    SubscriptionCustomersCollection.update({
      storeId: customer.storeId,
      externalId: +customer.externalId,
    }, {
      $set: {
        stripeCustomerId: customer.stripeCustomerId,
      },
    });
  }
};
