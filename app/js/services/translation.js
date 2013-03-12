'use strict';

define(['app', 'i18n!nls/general'], function(app, general) {
  app.factory('translate', function() {

    return function(key, args) {
      var data = general[key];
      if(data) {
        for(var key in args) {
          var value = args[key];
          key = '%' + key + '%';
          data = data.replace(key,value);
        }
        return data;
      }
      return '';
    }
  });
});
