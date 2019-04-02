import date from '../utilities/date';

export default {
  w1: {
    id: 'w1',
    label: 'Every Week',
    calInterval: 1,
    calLabel: 'weeks',
  },

  w2: {
    id: 'w2',
    label: 'Every 2 Weeks',
    calInterval: 2,
    calLabel: 'weeks',
  },

  w6: {
    id: 'w6',
    label: 'Every 6 Weeks',
    calInterval: 6,
    calLabel: 'weeks',
  },

  m1: {
    id: 'm1',
    label: 'Every Month',
    calInterval: 1,
    calLabel: 'months',
  },

  m2: {
    id: 'm2',
    label: 'Every 2 Months',
    calInterval: 2,
    calLabel: 'months',
  },

  m3: {
    id: 'm3',
    label: 'Every 3 Months',
    calInterval: 3,
    calLabel: 'months',
  },

  renewalDateForFrequency(frequencyId) {
    let renewalDate;
    if (frequencyId) {
      const calInterval = this[frequencyId].calInterval;
      const calLabel = this[frequencyId].calLabel;
      renewalDate = date.newMomentWithDefaultTime().add(
        calInterval,
        calLabel,
      );
    }
    return renewalDate;
  },

  labelValues() {
    return [
      { label: this.w1.label, value: this.w1.id },
      { label: this.w2.label, value: this.w2.id },
      { label: this.w6.label, value: this.w6.id },
      { label: this.m1.label, value: this.m1.id },
      { label: this.m2.label, value: this.m2.id },
      { label: this.m3.label, value: this.m3.id },
    ];
  },
};
