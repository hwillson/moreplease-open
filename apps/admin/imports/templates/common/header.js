import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import supportSiteMethods from '../../api/support/support_site';
import { log } from 'meteor/moreplease:common';

import './header.html';

Template.adminHeader.onCreated(function onCreated() {
  this.supportSiteUrl = new ReactiveVar('');
  const userDataHandle = this.subscribe('userData');
  this.autorun(() => {
    if (userDataHandle.ready() && Meteor.userId()) {
      supportSiteMethods.getSiteUrl.call((error, siteUrl) => {
        if (error) {
          log.error(error);
        } else if (siteUrl) {
          this.supportSiteUrl.set(siteUrl);
        }
      });
    }
  });
});

Template.adminHeader.helpers({
  supportSiteUrl() {
    return Template.instance().supportSiteUrl.get();
  },
});
