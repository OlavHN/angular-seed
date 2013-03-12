'use strict';

define(['app'], function(app) {
  app.controller('LoginCtrl', function($scope, sms, translate) {
    $scope.t = translate;
    $scope.login = function() {
      if ($scope.$invalid)
        return;

      sms.login($scope.username, $scope.password).then(function() {
        console.log('login went okay');
      }, $scope.register);
    }

    $scope.register = function() {
      sms.register($scope.username, $scope.password).then(function() {
        console.log('This is when the phone callback is triggered');
      }, function() {
        console.log('Wrong username or password');
      });
    }

    $scope.connect = function() {
      console.log('connectin\' phone');

      sms.pin($scope.pin).then(function(msisdn) {
        console.log(msisdn + 'verified');
      }, function(retryCode) {
        console.log(retryCode);
      });
    }

    $scope.resetPassword = function() {
      sms.resetPassword($scope.username).then(function() {
        $scope.showReset = true;
        $scope.$apply();
      }, function(errorTag) {
        // request_reset_code.not_supported
        console.log(errorTag);
      });
    }

    $scope.resetPasswordToken = function() {
      sms.resetPasswordToken($scope.username, $scope.token, $scope.password)
      .then(function() {
        console.log('password reset!');
      }, function(tag) {
        console.log(tag);
      });
    }

    // loggedIn is a promise guaranteed to resolve when use is logged in with a phone
    sms.onLogin = function(loggedIn) {
      $scope.showLogin = true;
      $scope.$apply();

      loggedIn.then(function() {
        $scope.showLogin = false;
        $scope.showRegister = false;
        $scope.$apply();
      });
    }

    sms.onLoginError = function(tag, reason) {
      console.log(tag);
    }

    var handlePhoneConnect = function(msisdn) {
      if (!$scope.number || $scope.number === "")
        $scope.number = msisdn || "+47";
        $scope.showRegister = true;
        $scope.$apply();
    }

    sms.onPhoneNeeded = handlePhoneConnect;
    sms.onPinNeeded = handlePhoneConnect;

  });
});

