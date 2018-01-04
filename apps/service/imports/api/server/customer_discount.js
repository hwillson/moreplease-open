import {
  SubscriptionsCollection,
  customerDiscountsCollection,
  SubscriptionCustomersCollection,
} from 'meteor/moreplease:common';

import createCustomer from './customer';

export const createCustomerDiscount = ({ storeId, data }) => {
  if (storeId && data) {
    // Create the customer if they don't already exist.
    const customer = data.customer;
    customer.storeId = storeId;
    const customerId = createCustomer(customer);

    // Create a new customer discount
    customerDiscountsCollection.createNewDiscount({
      customerId,
      storeId,
      label: data.customerDiscount.label,
      durationMonths: data.customerDiscount.durationMonths,
      discountPercent: data.customerDiscount.discountPercent,
    });
  }
};

export const deleteCustomerDiscount = ({ storeId, discountId }) => {
  let subscriptionData;
  if (storeId && discountId) {
    const customerDiscount =
      customerDiscountsCollection.findOne({ _id: discountId, storeId });
    if (customerDiscount) {
      customerDiscountsCollection.remove({ _id: discountId, storeId });

      const subscription = SubscriptionsCollection.findOne({
        customerId: customerDiscount.customerId,
        storeId,
      });

      subscriptionData = {
        subscription: {
          subtotal: +subscription.subscriptionSubtotal().toFixed(2),
          shipping:
            subscription.shippingCost ? +subscription.shippingCost.toFixed(2) : 0,
          total: +subscription.subscriptionTotal().toFixed(2),
        },
      };
    }
  }
  return subscriptionData;
};

export const readCustomerDiscount = ({ storeId, externalCustomerId }) => {
  let customerDiscount;
  if (storeId && externalCustomerId) {
    const customer = SubscriptionCustomersCollection.findOne({
      externalId: +externalCustomerId,
      storeId,
    });
    if (customer) {
      const fullCustomerDiscount = customerDiscountsCollection.findOne({
        customerId: customer._id,
        storeId,
      });
      if (fullCustomerDiscount) {
        customerDiscount = {
          label: fullCustomerDiscount.label,
          validFromDate: fullCustomerDiscount.validFromDate,
          validToDate: fullCustomerDiscount.validToDate,
          durationMonths: fullCustomerDiscount.durationMonths,
          discountPercent: fullCustomerDiscount.discountPercent,
          discountType: fullCustomerDiscount.discountType,
          status: fullCustomerDiscount.status,
        };
      }
    }
  }
  return customerDiscount;
};
