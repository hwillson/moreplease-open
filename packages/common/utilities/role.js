import { Roles } from 'meteor/alanning:roles';

export default {
  companyRole(userId) {
    let companyRole;
    if (userId) {
      const roles = Roles.getRolesForUser(userId);
      if (roles) {
        companyRole = roles[0];
      }
    }
    return companyRole;
  },
};
