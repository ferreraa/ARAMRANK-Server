var teemo = require("./server/teemo");
var dynamo = require("./server/dynamo");
var sumUtils = require("./server/summoner");
var league = require("./server/league");

var express = require('express');
var app = express();


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

  let dbSum = await dynamo.getSumByAccountId(sum.id);

  if(dbSum == null) {
    dynamo.putNewSummoner(sum);
    res.render('first_time', {sum: sum});
  } else {

    sum.rank = dbSum.rank;
    sum.wins = parseInt(dbSum.wins);
    sum.loss = parseInt(dbSum.loss);
    let lastTime = sumUtils.getLastTimeStamp(dbSum) +1;

    if(lastTime == null) {
      res.render('error');
      return;
    }

    let matches = await teemo.getMatchList(sum.accountId, lastTime);
    sum.history = [];



    let unchanged = true; //no need to update the db
    if(matches.length > 0) {
      unchanged = false; //new games => need to update the db
      let newMatches = await teemo.processAllMatches(matches, sum);
    }

    if( !unchanged ) {
      dynamo.updateSum(sum);
    } 


    res.render('player',
      { 
        sum: sum,
        rankString: league.rank2string(sum.rank)
      }
    );      
  }


});



app.listen(port, function() {
    console.log('app is running on http://localhost:' + port);
});