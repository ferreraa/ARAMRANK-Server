const teemo = require("./teemo");
const dynamo = require("./dynamo");
const sumUtils = require("./summoner");
const league = require("./league");
const ddragonManager = require("./ddragonManager");
const fs = require('fs');


/**
 * Uses the client's request in order to look the player up the DB and the API. 
 * Render the response to the client.
 * If the player doesn't exist at all, renders 404Sum.ejs
 * If riot's API is at strawberries, renders error.ejs
 * If the player exists but doesn't appear in my DB, upload it to my DB and render first_time.ejs
 * If the player exists in my DB but hasn't played any game since he was uploaded, render first_time.ejs
 * If the player exists and has played games, update the player accordingly, and render player.ejs
 */
async function searchPlayer(req, res) {
  //promises that need to be awaited before rendering first_time or player
  let promises = [];

  try {
    var sum = await teemo.searchSummoner(res.locals.name)
  } catch(error) {
    console.error(error);
    res.render('riotKO');
    return;
  }


  if (sum == null) {
    res.render('404Sum');
    return;
  } else if(typeof sum.id == 'undefined') {
    res.render('error');
    return;
  }

  res.locals.sum = sum;
  promises.push(ddragonManager.manageProfileIcon(sum.profileIconId));


  sum.mainChampId = await teemo.getSumMain(sum.id); 

  let dbSum = await dynamo.getSumByAccountId(sum.id);

  if(dbSum == null) {
    dynamo.putNewSummoner(sum);
    await promises;
    res.render('first_time');
    return;
  } 

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
  else if (dbSum.history.length == 0) {
    await promises;
    res.render('first_time');
    return;
  }

  if( !unchanged ) {
    let updateSumPromise = dynamo.updateSum(sum);
  } 


  let match2print = dbSum.history.concat(sum.history);
  let l = match2print.length;
  if(l>20) {
    match2print = match2print.slice(l-19,l);
  }
  match2print.reverse();
  sum.history = match2print;


  res.locals.rankString = league.rank2string(sum.rank, res.locals.__)


  sum.history.forEach(e => {
    promises.push(ddragonManager.manageChampionIcon(e.championName));
  });
  await Promise.all(promises);
  res.render('player');

  if( !unchanged )
    await updateSumPromise;
}



function updatePlayer(dbSum) {

  return new Promise( async (resolve, reject) => {

    let sum = await teemo.searchSummoner(dbSum.name);

    if (sum == null) {
      let message = new Date().toISOString() + ' - summoner not found';
      reject(console.error(message));
    } else if(typeof sum.id == 'undefined') {
      let message = new Date().toISOString() + ' - an error occured with the teemo request';
      reject(console.error(message));
    }


    sum.mainChampId = await teemo.getSumMain(sum.id); 

    sum.rank = dbSum.rank;
    sum.wins = parseInt(dbSum.wins);
    sum.loss = parseInt(dbSum.loss);
    let lastTime = sumUtils.getLastTimeStamp(dbSum) +1;

    if(lastTime == null) {
      let message = new Date().toISOString() + ' - lastTime == null within the row';
      reject(console.error(message));
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
      resolve(await dynamo.updateSum(sum));
    }
  });
}



function updatePlayers() {
  
  return new Promise( async (resolve) => 
  {
    dbUsers = await dynamo.getAllUsers();
    
    updatePromises = [];

    dbUsers.forEach(e => {
      updatePromises.push(updatePlayer(e));
    });

    Promise.all(updatePromises).then(resolve());
  });
}

module.exports.updatePlayers = updatePlayers;
module.exports.searchPlayer = searchPlayer;