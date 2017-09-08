import { Meteor } from 'meteor/meteor';

export default () => require('mailgun-js')({
  apiKey: Meteor.settings.private.email.mailgun.apiKey,
  domain: Meteor.settings.private.email.mailgun.domain,
});
