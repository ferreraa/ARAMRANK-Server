const visit = require("./server/visitors");
const champJSON = require("./server/champJSONManager");
const player = require('./server/player');

var i18n = require('i18n');
var express = require('express');
var app = express();
var schedule = require('node-schedule');
 


// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;

champJSON.manageChampionJSON()
  .then((version) => {process.env.RIOT_VERSION = version});


schedule.scheduleJob('0 0 */2 * * *', async function(){
  process.env.RIOT_VERSION = await champJSON.manageChampionJSON();
  console.log(new Date().toISOString());
});

// set the view engine to ejs
app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));

app.use('/en', express.static(__dirname + '/public'));
app.use('/fr', express.static(__dirname + '/public'));

i18n.configure({
  // sets a custom cookie name to parse locale settings from
  cookie: 'aramrank',

  // where to store json files - defaults to './locales'
  directory: __dirname + '/locales'
});



  // you will need to use cookieParser to expose cookies to req.cookies
//app.use(express.cookieParser());

  // i18n init parses req for language headers, cookies, etc.
app.use(i18n.init);



function manageBlackList(req, res) {
  let daily = visit.storeVisit(req.connection.remoteAddress);

  if(daily > 100 && process.env.NODE_ENV == 'production') {
    console.log("user ignored: ", req.connection.remoteAddress);
    return true;//Blacklisted for today
  }

  return false;
}


app.all('*', function (req, res, next) {
  res.locals.lang = "en";
  res.locals.version = process.env.RIOT_VERSION;
  console.log(res.locals.version);
  if(  !manageBlackList(req, res) )
    next();
});

app.param('lang', function (req, res, next, lang) {
  res.locals.lang = lang;
  next();
});

app.param('name', function (req, res, next, name) {
  res.locals.name = name;
  next();
});


// set the home page route
app.get('/', function(req, res) {
  res.render('index.ejs');
});

app.get('/:lang([a-z]{2})/', function(req, res) {
  res.render('index.ejs');
});



app.get('/player/:name', function(req, res) {
  player.searchPlayer(req, res);
});


app.get('/:lang([a-z]{2})/player/:name', function(req, res) {
  player.searchPlayer(req, res);
});



app.get('/:lang([a-z]{2})/about', function (req, res) {
  res.render('about');
});

app.get('/about', function (req, res) {
  res.render('about');
});



app.get('/:lang([a-z]{2})/contact', function (req, res) {
  res.render('contact');
});

app.get('/contact', function (req, res) {
  res.render('contact');
});

app.get('*', function (req, res) {
  res.status(404).send('quatre cent quatre. T\'es déçu ?');
});



app.listen(port, function() {
    console.log('app is running on http://localhost:' + port);
});