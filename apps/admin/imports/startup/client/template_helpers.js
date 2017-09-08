import { Template } from 'meteor/templating';

import {
  date as dateUtil,
  price as priceUtil,
  settings,
  subscriptionRenewalFrequency,
} from 'meteor/moreplease:common';

Template.registerHelper(
  'formatDate',
  (date, dateFormat) => dateUtil.formatDate(date, dateFormat),
);

Template.registerHelper(
  'formatLongDate',
  date => dateUtil.formatLongDate(date),
);

Template.registerHelper(
  'formatDateTime',
  date => dateUtil.formatDateTime(date),
);

Template.registerHelper(
  'formatPrice',
  (price, currency) => priceUtil.formatPrice(price, currency),
);

Template.registerHelper(
  'setting',
  property => settings.getSetting(property),
);

Template.registerHelper(
  'frequencyLabel',
  (frequencyId) => {
    let label;
    if (frequencyId) {
      label = subscriptionRenewalFrequency[frequencyId].label;
    }
    return label;
  },
);
