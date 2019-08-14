var teemo = require("./server/teemo.js");

var express = require('express');
var app = express();

var dynamo = require("./server/dynamo.js");

var sumUtils = require("./server/summoner");

// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;

// set the view engine to ejs
app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));


// set the home page route
app.get('/', async function(req, res) {

  if(req.query.name == null) {
    res.render('index.ejs');
    return;
  }

  let sum = await teemo.searchSummoner(req.query.name);

  if (sum == null) {
    res.render('404Sum', {name: req.query.name});
    return;
  }

  sum.mainChampId = await teemo.getSumMain(sum.id); 

  let dbSum = await dynamo.getSumByAccountId(sum.accountId);
  if(typeof dbSum.Item === 'undefined') {
    dynamo.putNewSummoner(sum);
  } else {

    sum.rank = dbSum.Item.rank.M;
    sum.wins = parseInt(dbSum.Item.wins.N);
    sum.loss = parseInt(dbSum.Item.loss.N);
    let lastTime = sumUtils.getLastTimeStamp(dbSum);
    let matches = await teemo.getMatchList(sum.accountId, lastTime);
    sum.history = dbSum.Item.history.L;

    let unchanged = true; //no need to update the db
    if(matches.length > 0) {
      unchanged = false; //new games => need to update the db
      let newMatches = await teemo.processAllMatches(matches, sum);
    }

    dynamo.updateSum(sum);

    res.render('player',
      { 
        sum: sum
      }
    );      
  }


});



app.listen(port, function() {
    console.log('app is running on http://localhost:' + port);
});