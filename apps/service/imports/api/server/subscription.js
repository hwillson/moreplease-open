import moment from 'moment';

import {
  SubscriptionsCollection,
  ProductsCollection,
  date as dateUtil,
  SubscriptionStatus,
  SubscriptionManager,
  subscriptionRenewalFrequency,
  subscriptionHistoryCollection,
  SubscriptionItemsCollection,
  subscriptionOrdersCollection,
  StoresCollection,
  transmitEvent,
  customerDiscountsCollection,
} from 'meteor/moreplease:common';
import { createCustomer } from './customer';

export const createSubscription = ({ storeId, subscriptionData }) => {
  let subscriptionId;
  if (storeId
    && subscriptionData.subscription
    && subscriptionData.subscriptionItems
  ) {
    const customer = subscriptionData.customer;
    customer.storeId = storeId;
    const customerId = createCustomer(customer);

    const renewalFrequencyId =
      subscriptionData.subscription.renewalFrequencyId
        ? subscriptionData.subscription.renewalFrequencyId
        : subscriptionRenewalFrequency.m1.id;

    const startDate =
      subscriptionData.subscription.migratedStartDate
        ? moment(subscriptionData.subscription.migratedStartDate)
        : moment();

    let renewalDate;
    if (subscriptionData.subscription.migratedRenewalDate) {
      renewalDate = dateUtil.newMomentWithDefaultTime(
        subscriptionData.subscription.migratedRenewalDate,
      );
      if (renewalDate.isBefore(moment())) {
        renewalDate = dateUtil.newMomentWithDefaultTime().add(1, 'days');
      }
    } else if (subscriptionData.includesFreeTrial) {
      // New subscription includes a free trial product, so set the next
      // renewal to fire in 14 days.
      renewalDate = dateUtil.newMomentWithDefaultTime().add(14, 'days');
    } else {
      renewalDate = subscriptionRenewalFrequency.renewalDateForFrequency(
        renewalFrequencyId,
      );
    }

    const subscription = {
      storeId,
      customerId,
      customerFirstName: subscriptionData.customer.firstName,
      customerLastName: subscriptionData.customer.lastName,
      customerEmail: subscriptionData.customer.email,
      startDate: startDate.toDate(),
      renewalFrequencyId,
      renewalDate: renewalDate.toDate(),
      statusId: SubscriptionStatus.active.id,
      shippingMethodId: subscriptionData.subscription.shippingMethodId,
      shippingMethodName: subscriptionData.subscription.shippingMethodName,
      shippingCost: subscriptionData.subscription.shippingCost,
    };

    if (subscriptionData.subscription.currency) {
      subscription.currency = subscriptionData.subscription.currency;
    }

    subscriptionId = SubscriptionsCollection.insert(subscription);
    subscriptionHistoryCollection.createHistoryEntry({
      storeId,
      subscriptionId,
      statusId: subscription.statusId,
    });

    const subscriptionItems = subscriptionData.subscriptionItems;
    subscriptionItems.forEach((subscriptionItem) => {
      const newSubItem = subscriptionItem;
      newSubItem.subscriptionId = subscriptionId;
      newSubItem.storeId = storeId;
      SubscriptionItemsCollection.insert(newSubItem);
    });

    if (subscriptionData.order) {
      const order = subscriptionData.order;
      order.subscriptionId = subscriptionId;
      order.storeId = storeId;
      subscriptionOrdersCollection.insert(order);
    }

    if (subscriptionData.customerDiscount &&
      Object.keys(subscriptionData.customerDiscount).length
    ) {
      const customerDiscount = subscriptionData.customerDiscount;
      customerDiscountsCollection.createNewDiscount({
        customerId,
        storeId,
        label: customerDiscount.label,
        durationMonths: customerDiscount.durationMonths,
        discountPercent: customerDiscount.discountPercent,
      });
    }

    if (subscriptionData.sendSubscriptionIdToStore) {
      SubscriptionManager.sendSubscriptionDetailsToStore({
        storeId,
        subscriptionId,
        customer,
      });
    }

    const newSubscription =
      SubscriptionsCollection.findOne({ _id: subscriptionId });

    // Fire "New Subscription" event
    const store = StoresCollection.findOne({ _id: subscription.storeId });
    transmitEvent({
      store,
      event: 'New Subscription',
      extra: {
        subscriptionId,
        subscriptionStatus: newSubscription.statusId,
        customerEmail: newSubscription.customerEmail,
        externalCustomerId: customer.externalId,
        nextShipmentDate: newSubscription.renewalDate,
        totalSubscriptionPrice:
          +newSubscription.subscriptionTotal().toFixed(2),
        subscriptionItems: newSubscription.getSubscriptionItems(),
        isFreeTrial: newSubscription.isFreeTrialSubscription(),
      },
    });
  }

  return { subscriptionId };
};

const prepareSubscriptionData = (subscription) => {
  const totals = subscription.subscriptionTotals();
  return {
    subscriptionId: subscription._id,
    startDate: subscription.startDate || null,
    renewalFrequencyId: subscription.renewalFrequencyId,
    renewalDate: subscription.renewalDate || null,
    statusId: subscription.statusId || null,
    subtotal: +totals.subtotal.toFixed(2),
    shipping: +subscription.getShippingCost().toFixed(2),
    total: +totals.total.toFixed(2),
  };
};

const prepareCustomerData = (subscription) => {
  const customer = subscription.getCustomer();
  let customerData;
  if (customer) {
    customerData = {
      customer: {
        customerId: customer._id,
        externalId: customer.externalId,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      },
    };
  }
  return customerData;
};

const prepareCustomerDiscountData = (subscription) => {
  const customerDiscount = customerDiscountsCollection.findOne({
    customerId: subscription.customerId,
    status: 'active',
    storeId: subscription.storeId,
  });
  const customerDiscountData = {};
  if (customerDiscount) {
    customerDiscountData.customerDiscount = customerDiscount;
  }
  return customerDiscountData;
};

const prepareSubscriptionItems = (subscription) => {
  let data;
  const subscriptionItems = subscription.getSubscriptionItems();
  if (subscriptionItems) {
    const productVariations = {};
    const items = subscriptionItems.map((item) => {
      const productVariation = item.productVariation();

      if (!productVariations[item.productId]) {
        const variations = {};
        ProductsCollection.findProductVariations(item.productId).forEach(
          (variation) => {
            variations[variation.variationId] = {
              name: variation.variationName,
              image: variation.productImage,
              price: variation.variationPrice,
            };
          },
        );
        productVariations[item.productId] = variations;
      }

      const prices = item.allPrices();
      return {
        itemId: item._id,
        productId: item.productId,
        productName: productVariation.productName,
        variationId: item.variationId,
        quantity: item.quantity,
        individualPrice: +prices.individualPrice.toFixed(2),
        totalPrice: +prices.totalPrice.toFixed(2),
        discountedTotalPrice: +prices.totalDiscountedPrice.toFixed(2),
        image: productVariation.productImage,
        variations: productVariations[item.productId],
      };
    });
    data = {
      items,
    };
  }

  return data;
};

export const readSubscription = ({ storeId, subscriptionId }) => {
  let subscriptionData;
  if (storeId && subscriptionId) {
    const subscription =
      SubscriptionsCollection.findOne({ _id: subscriptionId, storeId });
    if (subscription) {
      subscriptionData = Object.assign(
        prepareSubscriptionData(subscription),
        prepareCustomerData(subscription),
        prepareSubscriptionItems(subscription),
        prepareCustomerDiscountData(subscription),
      );
    }
  }
  return subscriptionData;
};

export const updateSubscription = ({ storeId, subscriptionId, subscriptionData }) => {
  let updated = false;
  if (storeId && subscriptionId && subscriptionData) {
    const subscription =
      SubscriptionsCollection.findOne({ _id: subscriptionId });
    if (subscription) {
      if (subscriptionData.statusId) {
        subscription.updateSubscriptionStatus(subscriptionData.statusId);
      }

      const updateData = {};
      if (subscriptionData.renewalFrequencyId) {
        updateData.renewalFrequencyId = subscriptionData.renewalFrequencyId;
      }
      if (subscriptionData.renewalDate) {
        let renewalDate =
          dateUtil.newMomentWithDefaultTime(subscriptionData.renewalDate);
        if (renewalDate.isBefore(moment())) {
          renewalDate = dateUtil.newMomentWithDefaultTime().add(1, 'days');
        }
        updateData.renewalDate = renewalDate.toDate();
      }

      if (Object.keys(updateData).length) {
        const updateCount = SubscriptionsCollection.update({
          _id: subscriptionId,
          storeId,
        }, {
          $set: updateData,
        });
        updated = !!updateCount;
      }
    }
  }

  return { updated };
};

export const subscriptionStatus = ({ storeId, subscriptionId }) => {
  let subscriptionData;
  if (storeId && subscriptionId) {
    const subscription =
      SubscriptionsCollection.findOne({ _id: subscriptionId, storeId });
    if (subscription) {
      subscriptionData = {
        subscriptionId: subscription._id,
        statusId: subscription.statusId,
        renewalDayCount: moment(subscription.renewalDate).diff(moment(), 'days'),
        renewalDate: subscription.renewalDate,
        renewalDateLong: dateUtil.formatLongDate(subscription.renewalDate),
      };
    }
  }
  return subscriptionData;
};

export const renewSubscription = ({ storeId, subscriptionId }) => {
  let renewedSuccessfuly = false;
  if (storeId && subscriptionId) {
    const subscription = SubscriptionsCollection.findOne({
      _id: subscriptionId,
    });

    if (subscription
        && subscription.statusId === SubscriptionStatus.failed.id) {
      renewedSuccessfuly = SubscriptionManager.createSubscriptionRenewal(
        subscriptionId,
      );
    }
  }
  return { renewedSuccessfuly };
};
