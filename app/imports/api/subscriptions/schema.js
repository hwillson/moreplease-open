import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const subscriptionSchema = new SimpleSchema({
  storeId: {
    type: String,
  },
  statusId: {
    type: String,
  },
  startDate: {
    type: Date,
  },
});

export default subscriptionSchema;
