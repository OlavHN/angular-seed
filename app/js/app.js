'use strict';

define(['angular'], function(angular) {

  var app =  angular.module('websms', []);

  /*app.config(['$routeProvider', function($routeProvider) {
    $routeProvider
    .when('/', {
      templateUrl: 'partials/conversation.html',
      controller: ConversationCtrl
    })
    .when('/:id', {
      templateUrl: 'partials/conversation.html',
      controller: ConversationCtrl
    })
    .otherwise({redirectTo: '/'});
  }]);*/

  return app;
});

