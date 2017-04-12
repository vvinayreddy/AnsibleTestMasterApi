var http = require('http');
var logger = require('log4js').getLogger();


function echoServer() {

    return {
        start: function (port) {
            var serverPort = port || 8080 ;
            http.createServer(function (request, response) {
                var body = [];
                request.on('error', function (err) {
                    logger.error(err);
                }).on('data', function (chunk) {
                    body.push(chunk);
                }).on('end', function () {
                    var responseBody = {
                        headers: request.headers,
                        method: request.method,
                        url: request.url,
                        body: Buffer.concat(body).toString()
                    }
                    logger.debug('response', responseBody);
                    response.statusCode = 200;
                    response.setHeader('Content-Type', 'application/json');
                    response.write(JSON.stringify(responseBody));
                    response.end();
                });
            }).listen(serverPort);
           logger.debug('Server listening on port:',serverPort);
        }
    }

}

module.exports = echoServer;