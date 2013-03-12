var http = require('http');
var path = require('path');
var connect = require('connect');

connect.static.mime.define({'application/x-web-app-manifest+json': ['webapp']});
connect.static.mime.define({'text/cache-manifest': ['appcache']});

// create a simple server
var server = connect()
  .use(connect.static(path.join(__dirname, 'app')));

// and set up the server
var port = process.env.PORT || 8081;
var host = process.env.IP || '0.0.0.0';
http.createServer(server).listen(port, host);

console.log('Server running at http://' + host + ':' + port);
