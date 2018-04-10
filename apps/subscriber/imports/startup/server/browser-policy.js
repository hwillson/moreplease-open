import { BrowserPolicy } from 'meteor/browser-policy';

BrowserPolicy.content.disallowInlineScripts();
BrowserPolicy.content.disallowEval();
BrowserPolicy.content.allowInlineStyles();
BrowserPolicy.content.allowImageOrigin('*');
BrowserPolicy.content.allowStyleOrigin('*');
BrowserPolicy.framing.allowAll();

const trusted = [
  'http://*.googleapis.com',
  'https://*.googleapis.com',
  'http://fonts.gstatic.com',
  'https://fonts.gstatic.com',
  'https://secure.gravatar.com',
  'http://*.wp.com',
  'http://*.kadira.io',
  'https://*.kadira.io',
];

trusted.forEach((origin) => {
  BrowserPolicy.content.allowOriginForAll(origin);
  BrowserPolicy.content.allowInlineScripts(origin);
});
