// Model
const SubscriptionStatus = {
  active: {
    id: 'active',
    label: 'Active',
  },
  paused: {
    id: 'paused',
    label: 'Paused',
  },
  cancelled: {
    id: 'cancelled',
    label: 'Cancelled',
  },
  failed: {
    id: 'failed',
    label: 'Payment Failed',
  },

  getLabel(statusId) {
    let label;
    if (statusId) {
      label = SubscriptionStatus[statusId].label;
    }
    return label;
  },

  getStatusIds() {
    return [
      SubscriptionStatus.active.id,
      SubscriptionStatus.paused.id,
      SubscriptionStatus.cancelled.id,
      SubscriptionStatus.failed.id,
    ];
  },
};

export default SubscriptionStatus;
