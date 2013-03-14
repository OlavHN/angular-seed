'use strict'

define(['app'], function(app) {
  app.factory('notification', function() {

    // If we're in node-webkit, use notification plugin
    if (window.requireNode) {
      console.log('figured we were in node-webkit')
      return window.LOCAL_NW.desktopNotifications.notify;
    }

    // Chrome notifications (Needs explicit opt-in)
    if (window.webkitNotifications) {
      return function(img, title, content, callback) {
        if (window.webkitNotifications.checkPermission() == 0)
          window.webkitNotifications.createNotification(img, title, content, callback);
      }
    }

    // No notification library ..
    return function() {};

  });
});
