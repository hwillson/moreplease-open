/* global document */

import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';
import React from 'react';

import App from '../imports/ui/components/App';

Meteor.startup(() => {
  render(<App />, document.getElementById('app'));
});


import { a } from 'meteor/some-package';
console.log(a);
