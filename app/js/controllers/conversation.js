'use strict'

define(['app'], function(app) {
  app.controller('ConversationCtrl', function($scope, sms, translate, notification) {
    $scope.t = translate;

    $scope.messages = {};

    $scope.limit = 30;

    $scope.conversations = {};

    $scope.show = function($event, conversation, number) {
      $scope.receiver = number;
      $scope.messages = conversation;
      
      $event.preventDefault();
    }

    $scope.expand = function() {
      $scope.limit = $scope.limit + 10;
    }

    $scope.send = function(content) {
      sms.send($scope.receiver, content);
      $scope.content = '';
    }

    $scope.getConversations = function() {
      return Object.keys($scope.conversations).map(function(x) {
        return $scope.conversations[x];
      });
    }

    $scope.getMessages = function() {
      return Object.keys($scope.messages).map(function(x) {
        if(!isNaN(x))
          return $scope.messages[x];
      }).filter(function(x) {return x;});
    }

    $scope.getNumber = function(message) {
      if(message.delivery === 'sent')
        return message.receiver;

      return message.sender;
    }

    var addMessages = function(messages) {
      var conversations = messages.reduce(function(aggregate, message) {
        if (!aggregate[message.conversation])
          aggregate[message.conversation] = {top: message};

        aggregate[message.conversation][message.id] = message;

        if (message.timestamp > aggregate[message.conversation].top.timestamp)
          aggregate[message.conversation].top = message;

        return aggregate;
      }, {});

      for (var conversation in conversations) {
        if (!$scope.conversations[conversation])
          $scope.conversations[conversation] = {};

        for(var message in conversations[conversation]) {
          $scope.conversations[conversation][message] = conversations[conversation][message];
        }
      }
   
      $scope.$apply();
    }

    sms.onMessage = function(message) {
      notification(null, message.sender, message.body, null);
    }

    sms.onMessagesUpdated = addMessages;

    sms.getMessages().then(function(messages) {
      addMessages(messages);
    });
  });
});
