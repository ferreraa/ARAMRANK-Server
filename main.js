var teemo = require("./server/teemo");
var dynamo = require("./server/dynamo");
var sumUtils = require("./server/summoner");
var league = require("./server/league");
const visit = require("./server/visitors");
const champJSON = require("./server/champJSONManager");

var i18n = require('i18n');
var express = require('express');
var app = express();


// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;

// set the view engine to ejs
app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));


i18n.configure({
  // setup some locales - other locales default to en silently
  locales: ['en', 'fr'],

  // sets a custom cookie name to parse locale settings from
  cookie: 'aramrank',

  queryParameter: 'lang',

  // where to store json files - defaults to './locales'
  directory: __dirname + '/locales'
})



  // you will need to use cookieParser to expose cookies to req.cookies
//app.use(express.cookieParser());

  // i18n init parses req for language headers, cookies, etc.
app.use(i18n.init);


// set the home page route
app.get('/', async function(req, res) {


  let daily = visit.storeVisit(res.connection.remoteAddress);

  if(daily > 100) {
    console.log("user ignored: ", req.connection.remoteAddress);
    return;//Blacklisted for today
  }
  let version = champJSON.manageChampionJSON();

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

    let match2print = sum.history.concat(dbSum.history);
    let l = match2print.length;
    if(l>20) {
      match2print = match2print.slice(l-19,19);
    }
    match2print.reverse();
    sum.history = match2print;
    res.render('player',
      { 
        sum: sum,
        rankString: league.rank2string(sum.rank),
        version: await version
      }
    );      
  }


});



app.listen(port, function() {
    console.log('app is running on http://localhost:' + port);
});