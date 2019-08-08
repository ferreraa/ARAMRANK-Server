var teemo = require("./server/teemo.js");

var express = require('express');
var app = express();

var dynamo = require("./server/dynamo.js");


function handleError(err, res) {
    res.json({ 'message': 'server side error', statusCode: 500, error: 
    err });
}

function handleSuccess(data, res) {
    res.json({ message: 'success', statusCode: 200, data: data })
}


// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;

// set the view engine to ejs
app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));


// set the home page route
app.get('/', async function(req, res) {

  if(req.query.name != null) {

    let sum = await teemo.searchSummoner(req.query.name);
    sum.mainChampId = await teemo.getSumMain(sum.id); 

    res.render('player', {name: sum.name, id: sum.id, main: sum.mainChampId});
    dynamo.putNewSummoner(sum);
      
  }
  else
      res.render('index');
    // ejs render automatically looks in the views folder
});

app.listen(port, function() {
    console.log('app is running on http://localhost:' + port);
});