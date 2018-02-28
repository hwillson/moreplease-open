import { Meteor } from 'meteor/meteor';
import Raven from 'raven';
import { WebApp } from 'meteor/webapp';
import bodyParser from 'body-parser';
import pathToRegexp from 'path-to-regexp';
import url from 'url';

import { apiAccess } from 'meteor/moreplease:common';
import {
  createSubscription,
  readSubscription,
  updateSubscription,
  subscriptionStatus,
  renewSubscription,
} from './subscription';
import {
  createSubscriptionItem,
  updateSubscriptionItem,
  deleteSubscriptionItem as removeSubscriptionItem,
} from './subscription_item';
import {
  createCustomerDiscount,
  deleteCustomerDiscount as removeCustomerDiscount,
  readCustomerDiscount,
} from './customer_discount';
import {
  addToSubscription,
  subscriptionRenewalDateAndStatus,
  subscriptionRenewalDayCount,
  createNewSubscription,
} from './legacy';

Raven.config(Meteor.settings.private.sentry.dsn, {
  environment: Meteor.isProduction ? 'production' : 'development',
}).install();

const getStoreId = (authHeader) => {
  let storeId;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const apiKey = new Buffer(token, 'base64').toString('ascii');
    storeId = apiAccess.findStoreIdForApiKey(apiKey);
  }
  return storeId;
};

const haveAccess = (request, successCallback, errorCallback) => {
  const authHeader = request.headers.authorization;
  const storeId = getStoreId(authHeader);
  let result;
  if (storeId || request.url.startsWith('/methods/api_')) {
    result = successCallback(storeId);
  } else {
    result = errorCallback();
  }
  return result;
};

const setHeaders = (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  response.setHeader(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS, DELETE, PUT',
  );
  response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With',
  );

  if (Meteor.settings.private.cors) {
    const allowedOrigins = Meteor.settings.private.cors.allowedOrigins;
    const origin = request.headers.origin;
    if (allowedOrigins.indexOf(origin) > -1) {
      response.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
};

const endpoints = {
  '/subscriptions': {
    POST(request, storeId) {
      const subscriptionData = request.body;
      return createSubscription({ storeId, subscriptionData });
    },
  },
  '/subscriptions/:subscriptionId': {
    GET(request, storeId, subscriptionId) {
      return readSubscription({ storeId, subscriptionId });
    },
    PUT(request, storeId, subscriptionId) {
      const subscriptionData = request.body;
      return updateSubscription({ storeId, subscriptionId, subscriptionData });
    },
  },
  '/subscriptions/:subscriptionId/subscription_items(.*)': {
    POST(request, storeId, subscriptionId) {
      const query = url.parse(request.url, true).query;
      const replace = !!query.replace;
      const subscriptionItems = request.body;
      return createSubscriptionItem({
        storeId,
        subscriptionId,
        subscriptionItems,
        replace,
      });
    },
  },
  '/subscriptions/:subscriptionId/status': {
    GET(request, storeId, subscriptionId) {
      return subscriptionStatus({ storeId, subscriptionId });
    },
  },
  '/subscriptions/:subscriptionId/renew': {
    PUT(request, storeId, subscriptionId) {
      return renewSubscription({ storeId, subscriptionId });
    },
  },
  '/subscription_items/:itemId': {
    PUT(request, storeId, itemId) {
      const itemData = request.body;
      return updateSubscriptionItem({ storeId, itemId, itemData });
    },
    DELETE(request, storeId, itemId) {
      return removeSubscriptionItem({ storeId, itemId });
    },
  },
  '/customer_discounts': {
    POST(request, storeId) {
      const data = request.body;
      return createCustomerDiscount({ storeId, data });
    },
  },
  '/customer_discounts/:discountId': {
    DELETE(request, storeId, discountId) {
      return removeCustomerDiscount({ storeId, discountId });
    },
  },
  '/customer_discounts/external/:externalCustomerId': {
    GET(request, storeId, externalCustomerId) {
      return readCustomerDiscount({ storeId, externalCustomerId });
    },
  },

  // Legacy
  '/methods/api_AddToSubscription': {
    POST(request) {
      return addToSubscription(request.body);
    },
  },
  '/methods/api_SubscriptionRenewalDateAndStatus': {
    POST(request) {
      return subscriptionRenewalDateAndStatus(request.body);
    },
  },
  '/methods/api_SubscriptionRenewalDayCount': {
    POST(request) {
      return subscriptionRenewalDayCount(request.body);
    },
  },
  '/methods/api_CreateNewSubscription': {
    POST(request) {
      return createNewSubscription(request.body);
    },
  },
};

const app = WebApp.connectHandlers;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use((req, res, next) => {
  const response = res;
  let serviceRouteMatch = false;
  if (req.method === 'OPTIONS') {
    setHeaders(req, response);
    response.end();
    return;
  }

  Object.keys(endpoints).forEach((endpointPath) => {
    const tokens = pathToRegexp(endpointPath).exec(req.url);
    if (tokens) {
      serviceRouteMatch = true;
      const id = tokens[1];
      let responseStatusCode = 200;
      let responseData;
      const handler = endpoints[endpointPath][req.method];
      if (handler) {
        haveAccess(
          req,
          (storeId) => {
            try {
              responseData = handler(req, storeId, id);
            } catch (error) {
              Raven.setContext({
                tags: {
                  service_path: endpointPath,
                  service_id: id,
                  service_store_id: storeId,
                },
              });
              Raven.captureException(error);
            }
          },
          () => {
            responseStatusCode = 401;
            responseData = {
              msg: 'Unauthorized',
            };
          },
        );
      } else {
        responseStatusCode = 400;
        responseData = {
          msg: 'Invalid web service endpoint',
        };
      }
      setHeaders(req, response);
      response.statusCode = responseStatusCode;
      response.end(JSON.stringify(responseData));
    }
  });

  if (!serviceRouteMatch) {
    next();
  }
});
