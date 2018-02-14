/* global Package, Npm */
/* eslint-disable prefer-arrow-callback */

Package.describe({
  name: 'moreplease:stitch',
  summary: 'Leverage the Stitch Labs API to manage draft subscription orders.',
  version: '0.0.1',
});

Npm.depends({
  raven: '2.1.2',
});

Package.onUse(function onUse(api) {
  api.versionsFrom('1.4.3.1');
  api.use('ecmascript');
  api.use('http@1.2.12');
  api.mainModule('server.js', 'server');
});

/*
Package.onTest(function onTest(api) {
  api.use('ecmascript');
  api.use('practicalmeteor:mocha');
  api.use('practicalmeteor:chai');
  api.use('moreplease:stitch');
  api.mainModule('tests/stitch_api_tests.js', 'server');
});
*/
