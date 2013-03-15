'use strict'

define(['app'], function(app) {
  app.factory('notification', function() {

    // If we're in node-webkit, use notification plugin
    if (window.requireNode) {
      window.requireJs = window.require;
      window.require = window.requireNode;

      var gui = require('nw.gui');
      var win = gui.Window.get();

      var menu = new gui.Menu();
      menu.append(new gui.MenuItem({
        label: 'Cookies for everyone!',
        click: function() {
          if (!maximized)
            win.restore();
          if (!focused) {
            win.focus();
            
          }
        }
      }));

      var tray = new gui.Tray({
        icon: 'app/img/tray_icon.png',
        menu: menu
      });

      var fs = require('fs');
      win.showDevTools()

      var unread = 0;
      var maximized = true;
      var focused = true;
      var drawTray = function(numMessages) {
        var trayCanvas = document.createElement('canvas');
        trayCanvas.height = '18';
        trayCanvas.width = '30';
        var trayCanvasCtx = trayCanvas.getContext('2d');

        var canvasBg = new Image();
        canvasBg.onload = function() {
          trayCanvasCtx.drawImage(canvasBg, 0, 0);
          trayCanvasCtx.fillText(numMessages, 5, 16);

          var regex = /^data:.+\/(.+);base64,(.*)$/;

          var matches = trayCanvas.toDataURL("image/png").match(regex);
          var ext = matches[1];
          var data = matches[2];
          var buffer = new Buffer(data, 'base64');
          fs.writeFileSync('app/img/tray_icon_tmp.' + ext, buffer);
          if (numMessages)
            tray.icon = 'app/img/tray_icon_tmp.png';
          else
            tray.icon = 'app/img/tray_icon.png';
        }
        canvasBg.src = 'img/tray_icon.png';

        trayCanvasCtx.fillStyle = "white";
        trayCanvasCtx.font = "bold 18px Arial";
      }

      win.on('minimize', function() {
        console.log('minimize')
        maximized = false;
      });

      win.on('restore', function() {
        console.log('restore')
        maximized = true;
      });

      win.on('focus', function() {
        console.log('focus')
        focused = true;
        unread = 0;
        drawTray(unread);
      });

      win.on('blur', function() {
        focused = false;
      });

      window.requireNode = window.require;
      window.require = window.requireJs;

      return function(img, title, content, callback) {
        if (!focused)
          drawTray(++unread);
        console.log('making notify')
        window.LOCAL_NW.desktopNotifications.notify(img, title, content, callback);
      }
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
