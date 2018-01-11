/* eslint-disable no-console */

import { HTTP } from 'meteor/http';
import { Base64 } from 'meteor/base64';

const transmitEvent = ({ store, event, category, extra }) => {
  if (store && event) {
    const webhookUrl = store.webhookUrl;
    if (webhookUrl) {
      try {
        HTTP.post(webhookUrl, {
          headers: {
            authorization: `Basic ${Base64.encode('moreplease')}`,
          },
          params: {
            data: JSON.stringify({
              event,
              category,
              extra,
            }),
          },
        });
      } catch (error) {
        console.info(
          `Webhook URL "${webhookUrl}" is not reachable. Events will ` +
          'not be transmitted.',
        );
      }
    }
  }
};

export default transmitEvent;
