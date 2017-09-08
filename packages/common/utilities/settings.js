import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import role from './role';

export default {
  getSetting(property) {
    let userId;
    try {
      userId = Meteor.userId();
    } catch (error) {
      // Do nothing - userId will stay as undefined.
    }
    let setting;
    if (property) {
      let companyRole;
      if (userId) {
        companyRole = role.companyRole(userId);
      } else {
        companyRole = Session.get('companyRole');
      }
      if (companyRole) {
        setting = Meteor.settings.public[companyRole][property];
      }
    }
    return setting;
  },

  getCompanySetting(companyRole, property) {
    return (property && companyRole)
      ? Meteor.settings.public[companyRole][property]
      : undefined;
  },
};
