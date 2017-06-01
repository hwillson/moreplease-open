/* global document */

import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';
import React from 'react';

import WidgetsContainer from '../imports/ui/containers/WidgetsContainer';

Meteor.startup(() => {
  render(<WidgetsContainer />, document.getElementById('app'));
});
