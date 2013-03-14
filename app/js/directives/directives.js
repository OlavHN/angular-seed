'use strict';

/* Directives */

define(['app'], function(app) {

  app.directive('ngPlaceholder', function () {
    return {
      restrict: 'A',
      link: function (scope, element, attrs) {
        scope.$watch(attrs.ngPlaceholder, function(value) {
          element[0].placeholder = value;
        });
      }
    }
  });

  app.directive('scrollToLast', function () {
    return function (scope, element, attributes) {
      if (scope.$last) {
        scope.$watch(attributes.scrollToLast, function(value) {
          var div = document.getElementById(value);
          div.scrollTop = div.scrollHeight;
        });
      }
    }
  });

  app.directive('passwordValidate', function() {
    return {
      require: 'ngModel',
      link: function(scope, elm, attrs, ctrl) {
        ctrl.$parsers.unshift(function(viewValue) {

          scope.pwdValidLength = (viewValue && viewValue.length >= 6 ? 'valid' : undefined);
          scope.pwdHasUppercase = (viewValue && /[a-z]/.test(viewValue)) ? 'valid' : undefined;
          scope.pwdHasLowercase = (viewValue && /[A-Z]/.test(viewValue)) ? 'valid' : undefined;

          if(scope.pwdValidLength && scope.pwdHasUppercase && scope.pwdHasLowercase) {
            ctrl.$setValidity('pwd', true);
            return viewValue;
          } else {
            ctrl.$setValidity('pwd', false);                    
            return undefined;
          }
        });
      }
    };
  });

  app.directive('validPhoneNumber', function(sms) {
    var format = /\+47\d{8}/;
    var toId;
    return {
      restrict: 'EA',
      require: 'ngModel',
      link: function(scope, elem, attr, ctrl) {
        // when the scope changes, check the number.
        scope.$watch(attr.ngModel, function(value) {
          // is it a valid number format yet?
          if (!format.test(value)) {
            ctrl.$setValidity('validPhoneNumber', false);
            return;
          }

          // if there was a previous attempt, stop it.
          if(toId) clearTimeout(toId);

          // start a new attempt with a delay to keep it from
          // getting too "chatty".
          toId = setTimeout(function(){
            sms.phone(value).then(function(number) {
              scope.$apply(function() {
                ctrl.$setValidity('validPhoneNumber', true);
              });
            }, function(errorTag) {
              scope.$apply(function() {
                ctrl.$setValidity('validPhoneNumber', false);
                sms.onLoginError(errorTag);
                console.log('error with ' + errorTag);
              });
            });
          }, 200);
        })
      }
    }
  });

  return app;
});
