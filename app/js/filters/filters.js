'use strict';

/* Filters */
define(['app'], function(app) {
  app.filter('truncate', function() {
    return function(text, length, end) {
      end = end || ' ...';
      length = length || 10;

      if (text.length - end.length > length)
        return text.substring(0, length) + end;

      return text;
    }
  });

  return app;
});

