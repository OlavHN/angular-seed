require.config({
  shim: {
    'angular': {
      deps: ['Q'],
      exports: 'angular'
    }
  },
  paths: {
    Q: 'components/q/q',
    angular: 'components/angular/angular',
    app: 'js/app',
    i18n: 'js/i18n',
    nls: 'js/nls'
  },
  baseUrl: ''
});

require([
  // libs
  'angular',

  // app
  'app',
  'js/services/sms',
  'js/services/indexedDb',
  'js/services/translation',
  'js/controllers/conversation',
  'js/controllers/login',
  'js/filters/filters',
  'js/directives/directives'
], function(angular, app) {
  // TODO: Include requirejs DOMReady plugin for bootstrapping
  angular.bootstrap(document, ['websms']);
});
