export default {
  reminder: {
    id: 'reminder',
    label: 'Reminder',
  },

  paymentFailed: {
    id: 'paymentFailed',
    label: 'Payment Failed',
  },

  allTypes() {
    return [
      this.reminder.id,
      this.paymentFailed.id,
    ];
  },
};
