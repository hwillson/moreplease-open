import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/alanning:roles';

const username = Meteor.settings.private.admin.username;
if (!Meteor.users.findOne({ username })) {
  const userId = Accounts.createUser({
    username,
    email: Meteor.settings.private.admin.email,
    password: 'change-this-password-please',
  });
  Roles.addUsersToRoles(userId, ['mp-admin']);
}
