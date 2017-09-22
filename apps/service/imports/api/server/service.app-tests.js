/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

import {
  describe,
  it,
  beforeEach,
  afterEach,
} from 'meteor/practicalmeteor:mocha';
import { expect } from 'meteor/practicalmeteor:chai';
import { HTTP } from 'meteor/http';

import {
  SubscriptionsCollection,
  ProductsCollection,
  apiKeysCollection,
  StoresCollection,
  SubscriptionItemsCollection,
} from 'meteor/moreplease:common';

const BEARER = 'YWJjMTIz';
const HOST = 'http://localhost:3250';

describe('imports.api.service', function () {
  beforeEach(function () {
    // Seed initial data

    const storeId = StoresCollection.insert({
      accountId: 1,
      storeType: 'test',
      url: 'https://fakestore.com',
      subscriptionOrderUrl: 'https://fakestore.com',
      subscriptionPageUrl: 'https://fakestore.com',
      customerDetailsUrl: 'https://fakestore.com',
      customerOrdersUrl: 'https://fakestore.com',
      availableRenewalFrequencies: ['m1'],
      storeWsAuthUser: 'testuser',
      storeWsAuthPass: 'testpass',
      subscriptionRenewalStartTime: '12:00 am',
      disableRenewals: true,
      defaultShippingMethod: {
        externalId: '123',
        name: 'Default Shipping',
        cost: 10.00,
      },
      freeShippingMethod: {
        externalId: '456',
        name: 'Free Shipping',
        cost: 0,
      },
      freeTrialShippingMethod: {
        externalId: '789',
        name: 'Trial Shipping',
        cost: 5.00,
      },
    });

    apiKeysCollection.insert({
      key: 'abc123',
      created: new Date(),
      storeId,
    });

    ProductsCollection.insert({
      productId: 1,
      productUrl: 'http://test.test/prod/1',
      productName: 'Test Product',
      variationId: 2,
      variationName: 'Fruit Explosion',
      variationPrice: 5.00,
      storeId,
    });

    const subscriptionId = SubscriptionsCollection.insert({
      storeId,
      customerId: 1,
      customerFirstName: 'Jack',
      customerLastName: 'Jones',
      customerEmail: 'jack.jones@test.abc',
      statusId: 'active',
      renewalDate: new Date('2020-01-01'),
    });

    SubscriptionItemsCollection.insert({
      subscriptionId,
      productId: 1,
      variationId: 2,
      quantity: 1,
      storeId,
    });
  });

  afterEach(function () {
    // Remove old data
    SubscriptionsCollection.remove({});
    apiKeysCollection.remove({});
    ProductsCollection.remove({});
    StoresCollection.remove({});
    SubscriptionItemsCollection.remove({});
  });

  describe('POST /subscriptions', function () {
    it('should create a new subscription', function () {
      const subscriptionData = {
        subscription: {
          renewalFrequencyId: 'm1',
          shippingMethodId: 123,
          shippingMethodName: 'Test Shipping',
          shippingCost: 5.00,
          currency: 'USD',
        },
        customer: {
          externalId: 456,
          email: 'test@abc.123',
          firstName: 'Frank',
          lastName: 'Jones',
        },
        order: {
          orderId: 789,
          orderTypeId: 'new',
          orderDate: new Date(),
        },
        subscriptionItems: [
          {
            productId: 1,
            variationId: 2,
            quantity: 5,
            discountPercent: 10,
          },
        ],
      };

      return Promise.resolve().then(() => {
        const response = HTTP.post(`${HOST}/subscriptions`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${BEARER}`,
          },
          data: subscriptionData,
        });
        const subscriptionId = response.data.subscriptionId;
        expect(subscriptionId).to.not.be.empty;
        expect(
          SubscriptionsCollection.findOne({ _id: subscriptionId }),
        ).to.not.be.empty;
      });
    });
  });

  describe('GET /subscriptions/:subscriptionId', function () {
    it('should retrieve an existing subscription', function () {
      return Promise.resolve().then(() => {
        const subscription = SubscriptionsCollection.findOne();
        const response = HTTP.get(
          `${HOST}/subscriptions/${subscription._id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${BEARER}`,
            },
          },
        );
        expect(response).to.not.be.empty;
        expect(response.data).to.not.be.empty;
        expect(response.data.subscriptionId).to.not.be.empty;
      });
    });
  });

  describe('PUT /subscriptions/:subscriptionId', function () {
    it('should update an existing subscription', function () {
      return Promise.resolve().then(() => {
        let subscription = SubscriptionsCollection.findOne();
        expect(subscription.statusId).to.equal('active');
        HTTP.put(
          `${HOST}/subscriptions/${subscription._id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${BEARER}`,
            },
            data: { statusId: 'paused' },
          },
        );
        subscription = SubscriptionsCollection.findOne();
        expect(subscription.statusId).to.equal('paused');
      });
    });
  });

  describe('POST /subscriptions/:subscriptionId/subscription_items(.*)', function () {
    it('should add a new subscription item', function () {
      const subscription = SubscriptionsCollection.findOne();
      expect(
        SubscriptionItemsCollection.find({
          subscriptionId: subscription._id,
        }).count(),
      ).to.equal(1);

      const subItems = [{
        subscriptionId: subscription._id,
        productId: 1,
        variationId: 2,
        quantity: 1,
        storeId: subscription.storeId,
      }];

      return Promise.resolve().then(() => {
        HTTP.post(
          `${HOST}/subscriptions/${subscription._id}/subscription_items`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${BEARER}`,
            },
            data: subItems,
          },
        );
        expect(
          SubscriptionItemsCollection.find({
            subscriptionId: subscription._id,
          }).count(),
        ).to.equal(2);
      });
    });

    it('should replace all existing subscription items with the new item when using ?replace=1', function () {
      const subscription = SubscriptionsCollection.findOne();
      expect(
        SubscriptionItemsCollection.find({
          subscriptionId: subscription._id,
        }).count(),
      ).to.equal(1);

      const subItems = [{
        subscriptionId: subscription._id,
        productId: 2,
        variationId: 3,
        quantity: 1,
        storeId: subscription.storeId,
      }];

      return Promise.resolve().then(() => {
        HTTP.post(
          `${HOST}/subscriptions/${subscription._id}/subscription_items?replace=1`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${BEARER}`,
            },
            data: subItems,
          },
        );
        expect(
          SubscriptionItemsCollection.find({
            subscriptionId: subscription._id,
          }).count(),
        ).to.equal(1);
      });
    });
  });

  describe('GET /subscriptions/:subscriptionId/status', function () {
    it('should retrieve the subscription status', function () {
      return Promise.resolve().then(() => {
        const subscription = SubscriptionsCollection.findOne();
        const response = HTTP.get(
          `${HOST}/subscriptions/${subscription._id}/status`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${BEARER}`,
            },
          },
        );
        expect(response).to.not.be.empty;
        expect(response.data).to.not.be.empty;
        expect(response.data.statusId).to.not.be.empty;
      });
    });
  });

  describe('PUT /subscriptions/:subscriptionId/renew', function () {
    it('should renew a subscription', function () {
      return Promise.resolve().then(() => {
        const subscription = SubscriptionsCollection.findOne();
        SubscriptionsCollection.update({
          _id: subscription._id,
        }, {
          $set: {
            statusId: 'failed',
          },
        });
        const response = HTTP.put(
          `${HOST}/subscriptions/${subscription._id}/renew`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${BEARER}`,
            },
          },
        );
        expect(response).to.not.be.empty;
        expect(response.data).to.not.be.empty;
        expect(response.data.renewedSuccessfuly).to.be.true;
      });
    });
  });

  describe('PUT /subscription_items/:itemId', function () {
    it('should update the subscription items quantity', function () {
      return Promise.resolve().then(() => {
        let subscriptionItem = SubscriptionItemsCollection.findOne();
        expect(subscriptionItem.quantity).to.equal(1);
        HTTP.put(
          `${HOST}/subscription_items/${subscriptionItem._id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${BEARER}`,
            },
            data: {
              quantity: 2,
            },
          },
        );
        subscriptionItem = SubscriptionItemsCollection.findOne();
        expect(subscriptionItem.quantity).to.equal(2);
      });
    });
  });

  describe('DELETE /subscription_items/:itemId', function () {
    it('should remove a subscription item', function () {
      return Promise.resolve().then(() => {
        let subscriptionItem = SubscriptionItemsCollection.findOne();
        expect(subscriptionItem).to.not.be.empty;
        HTTP.del(
          `${HOST}/subscription_items/${subscriptionItem._id}`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${BEARER}`,
            },
          },
        );
        subscriptionItem = SubscriptionItemsCollection.findOne();
        expect(subscriptionItem).to.be.empty;
      });
    });
  });
});
