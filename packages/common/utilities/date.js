import { moment } from 'meteor/momentjs:moment';

export default {
  formatDate(date, dateFormat) {
    let newDateFormat = dateFormat;
    if (!dateFormat) {
      newDateFormat = 'YYYY-MM-DD';
    }
    return moment(date).format(newDateFormat);
  },

  formatLongDate(date) {
    return moment(date).format('MMMM Do, YYYY');
  },

  formatDateTime(date) {
    return moment(date).format('YYYY-MM-DD hh:mm:ss A');
  },

  /**
   * Sets default time to be 8 AM (UTC).
   *
   * @param   {Date}    date        Date to convert to moment; will use current
   *                                date if none is provided.
   * @param   {String}  dateFormat  Date format string.
   * @return  {Object}              Moment object with specified time.
   */
  newMomentWithDefaultTime(date, dateFormat) {
    let newMoment;
    if (date) {
      newMoment = moment(date, dateFormat);
    } else {
      newMoment = moment();
    }
    return newMoment.hour(8).minute(0).second(0);
  },
};
