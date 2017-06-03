import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const subscriptionOrderSchema = new SimpleSchema({
  storeId: {
    type: String,
  },
  subscriptionId: {
    type: String,
  },
  totalPrice: {
    type: Date,
  },
});

export default subscriptionOrderSchema;
