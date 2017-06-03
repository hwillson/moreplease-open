const subscriptionStatus = {
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
      label = subscriptionStatus[statusId].label;
    }
    return label;
  },

  getStatusIds() {
    return [
      subscriptionStatus.active.id,
      subscriptionStatus.paused.id,
      subscriptionStatus.cancelled.id,
      subscriptionStatus.failed.id,
    ];
  },
};

export default subscriptionStatus;
