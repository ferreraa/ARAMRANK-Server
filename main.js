var http = require("http");

http.createServer(function (request, response) {
	//Send the HTTP header
	//HTTP Status: 200:OK
	//Content-type: text/plain
	response.writeHead(200, {'Content-type': 'text/plain'});

	//send the response body as "Hello world!"
	response.end('Hello World!');
}).listen(8081);

// Console will print the message
console.log('server runnning at localhost:8081');