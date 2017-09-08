import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

Meteor.methods({
  transmitEvent({ store, event, category, extra }) {
    check(store, Object);
    check(event, String);
    check(category, Match.OneOf(undefined, null, String));
    check(extra, Match.OneOf(undefined, null, Object));

    if (!this.isSimulation && store) {
      import transmitEvent from './transmit_event';
      transmitEvent({ store, event, category, extra });
    }
  },
});
