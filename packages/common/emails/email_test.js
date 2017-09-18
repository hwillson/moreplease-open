import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

import { emailsCollection } from './email';
import emailUtil from '../utilities/email';

// Schemas
export const emailTestSchema = new SimpleSchema({
  emailId: {
    type: String,
    autoform: {
      afFieldInput: {
        type: 'hidden',
      },
    },
  },
  emailAddress: {
    type: String,
    label: 'Recipient Email Address',
    regEx: SimpleSchema.RegEx.Email,
  },
});

// Methods
export const emailTestMethods = {
  send: new ValidatedMethod({
    name: 'MorePlease.methods.emailTest.send',
    validate: emailTestSchema.validator(),
    run(doc) {
      if (!this.isSimulation) {
        if (this.userId) {
          const email = emailsCollection.findOne({
            _id: doc.emailId,
          });
          emailUtil.sendEmail(
            doc.emailAddress,
            email.from,
            email.subject,
            email.body,
            null,
            email.bcc,
          );
        } else {
          throw new Meteor.Error(
            'MorePlease.methods.emailTest.send: Unauthorized access.',
          );
        }
      }
    },
  }),
};
