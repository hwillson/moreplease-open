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

const haveAccess = (authHeader, successCallback, errorCallback) => {
  const storeId = getStoreId(authHeader);
  let result;
  if (storeId) {
    result = successCallback(storeId);
  } else {
    result = errorCallback();
  }
  return result;
};

const setHeaders = (request, response) => {
  response.setHeader('Content-Type', 'application/json');
  // const allowedOrigins = Meteor.settings.private.cors.allowedOrigins;
  // const origin = request.headers.origin;
  // if (allowedOrigins.indexOf(origin) > -1) {
  //   response.setHeader('Access-Control-Allow-Origin', origin);
  // }
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
};

const app = WebApp.rawConnectHandlers;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use((req, res, next) => {
  let serviceRouteMatch = false;
  Object.keys(endpoints).forEach((endpointPath) => {
    const tokens = pathToRegexp(endpointPath).exec(req.url);
    if (tokens) {
      serviceRouteMatch = true;
      const id = tokens[1];
      const handler = endpoints[endpointPath][req.method];

      Promise.resolve().then(() => {
        let responseStatusCode = 200;
        let responseData;
        haveAccess(
          req.headers.authorization,
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
        const response = res;
        setHeaders(req, response);
        response.statusCode = responseStatusCode;
        response.end(JSON.stringify(responseData));
      });
    }
  });

  if (!serviceRouteMatch) {
    next();
  }
});
