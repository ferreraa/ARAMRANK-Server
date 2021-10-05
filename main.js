'use strict';

const visit = require("./server/visitors");
const champJSON = require("./server/champJSONManager");
const player = require('./server/player');
const ladder = require('./server/ladder');
const league = require('./server/league');
const ddragonManager = require('./server/ddragonManager');

const i18n = require('i18n');
const express = require('express');
const schedule = require('node-schedule');
const cookieParser = require('cookie-parser');
const redirectSSL = require('redirect-ssl');

const app = express();

// set the port of our application
// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;

ladder.updateLadder();

champJSON.manageChampionJSON()
  .then((version) => {process.env.RIOT_VERSION = version});


schedule.scheduleJob('0 0 */2 * * *', async () => {
  process.env.RIOT_VERSION = await champJSON.manageChampionJSON();
  console.log(new Date().toISOString() + ' - riot version = ' + process.env.RIOT_VERSION);
});

schedule.scheduleJob('0 0 * * * *', () => {
  player.updatePlayers()
    .then(ladder.updateLadder)
    .catch(console.error);
});


//https redirect
app.use(redirectSSL.create({
  enabled: process.env.NODE_ENV === 'production'
}));

// set the view engine to ejs
app.set('view engine', 'ejs');

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));

app.use('/en', express.static(__dirname + '/public'));
app.use('/fr', express.static(__dirname + '/public'));

app.use(cookieParser());

i18n.configure({

  locales: ['en', 'fr'],

  // sets a custom cookie name to parse locale settings from
  cookie: 'aramrank',

  // where to store json files - defaults to './locales'
  directory: __dirname + '/public/locales',
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

/**
 *  set cookie 'locale' using the given response object
 */
function setLocaleCookie(locale, response) {
    response.cookie('locale',locale, { expires: new Date(Date.now() + 365*24*60*60*1000), httpOnly: true });
}

/**
 *  retrieves the 'locale' cookie from the given request object
 */
function getLocaleCookie(request) {
  return request.cookies.locale;
}

app.all('*', function (req, res, next) {
  var arr_url = req.url.split('/');
  var loc = arr_url[1];
  if (loc === 'en' || loc === 'fr') {
    arr_url.splice(1,1);
    res.locals.currentURL = arr_url.join('/');
    setLocaleCookie(loc, res);
    if (loc === 'en') {
      res.redirect(res.locals.currentURL);
      return;
    }
  }
  else {
    loc = getLocaleCookie(req) || 'en';
    if (loc !== 'en') {
      res.redirect('/'+loc+req.url);
      return;
    }
    res.locals.currentURL = req.url;
  }
  res.locals.locale = 'en';
  res.locals.version = process.env.RIOT_VERSION;
  if (!manageBlackList(req, res))
    next();
});

//the 'lang' parameter defines the locale used on client side.
app.param('lang', function (req, res, next, lang) {
  res.locals.locale = lang;
  next();
});

//The 'name' parameter corresponds to the name of the player.
app.param('name', function (req, res, next, name) {
  res.locals.name = name;
  next();
});


// set the home page route
// (:lang[a-z]{2})|) uses the parameter :lang or no parameters. This is used in every query handler.
app.get('(/:lang([a-z]{2})|)', function(req, res) {
  res.render('index.ejs');
});


app.get('(/:lang([a-z]{2})|)/player/:name', function(req, res) {
  player.searchPlayer(req, res);
});


app.get('(/:lang([a-z]{2})|)/ladder', function (req, res) {
  getLadder(res);
});

async function getLadder(res) {
  res.locals.ladder = ladder.readLadder();
  res.locals.leaguejs = league;
  let iconDownloadPromises = [];
  res.locals.ladder.forEach(e => {
    iconDownloadPromises.push(ddragonManager.manageProfileIcon(e.iconId))
  });
  await Promise.all(iconDownloadPromises).catch(console.error);
  res.render('ladder');
}

app.get('*/pico', function(req, res) {
  res.render('pico');
})


app.get('(/:lang([a-z]{2})|)/about', function (req, res) {
  res.render('about');
});


app.get('(/:lang([a-z]{2})|)/contact', function (req, res) {
  res.render('contact');
});


app.get('*', function (req, res) {
  res.status(404).send('quatre cent quatre. T\'es déçu ?');
});



app.listen(port, function() {
    console.log('app is running on http://localhost:' + port);
});