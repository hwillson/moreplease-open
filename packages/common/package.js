/* global Package, Npm */
/* eslint-disable prefer-arrow-callback */

Package.describe({
  name: 'moreplease:common',
  version: '0.0.1',
  summary: 'MorePlease common functionality',
});

Npm.depends({
  raven: '2.1.2',
  'mailgun-js': '0.7.7',
});

Package.onUse(function onUse(api) {
  api.versionsFrom('1.5.1');
  api.use('ecmascript');
  api.use('momentjs:moment');
  api.use('alanning:roles');
  api.use('session');
  api.use('practicalmeteor:loglevel');
  api.use('aldeed:collection2@2.3.3');
  api.use('aldeed:autoform@=5.8.1');
  api.use('aldeed:simple-schema@1.5.3');
  api.use('mdg:validated-method@1.1.0');
  api.use('matb33:collection-hooks');
  api.use('http@1.2.12');
  api.use('ongoworks:security@2.1.0');
  api.use('aslagle:reactive-table@0.8.42');
  api.mainModule('common_client.js', 'client');
  api.mainModule('common_server.js', 'server');
});
