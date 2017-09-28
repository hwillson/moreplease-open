/* eslint-disable func-names, prefer-arrow-callback, no-unused-expressions */

import {
  describe,
  it,
} from 'meteor/practicalmeteor:mocha';
import { expect } from 'meteor/practicalmeteor:chai';
import { $ } from 'meteor/jquery';

const BEARER = 'YWJjMTIz';
const HOST = 'http://localhost:3250';

describe('imports.api.service', function () {
  describe('PUT /subscriptions/:subscriptionId', function () {
    it('should attempt to update an non-existent subscription and fail', function () {
      return $.ajax({
        type: 'PUT',
        url: `${HOST}/subscriptions/abc123`,
        contentType: 'application/json',
        dataType: 'json',
        beforeSend(xhr) {
          xhr.setRequestHeader('Authorization', `Bearer ${BEARER}`);
        },
        data: JSON.stringify({
          renewalFrequencyId: 'w1',
          statusId: 'active',
        }),
      }).then((data) => {
        expect(data).to.not.be.empty;
        expect(data.updated).to.be.false;
      }, (jqXHR, textStatus, error) => {
        expect(error).to.be.undefined;
      });
    });
  });
});
