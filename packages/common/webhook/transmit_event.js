import { HTTP } from 'meteor/http';
import { Base64 } from 'meteor/base64';

const transmitEvent = ({ store, event, category, extra }) => {
  if (store && event) {
    const webhookUrl = store.webhookUrl;
    if (webhookUrl) {
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
    }
  }
};

export default transmitEvent;
