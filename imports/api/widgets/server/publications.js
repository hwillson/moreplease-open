/* eslint-disable prefer-arrow-callback */

import { Meteor } from 'meteor/meteor';

import widgetsCollection from '../collection';

Meteor.publish('widgets', function publishWidgets() {
  return widgetsCollection.find();
});
