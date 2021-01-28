'use strict';

const teemo = require("./teemo");
const dynamo = require("./dynamo");
const sumUtils = require("./summoner");
const league = require("./league");
const ddragonManager = require("./ddragonManager");
const fs = require('fs');

// Map of individual locks in order to prevent a specific player from getting updated
var locksMap = new Map();

/**
 * Locked this specific player's lock is taken
 */
function isLocked(sumId) {
  return locksMap.has(sumId) && locksMap.get(sumId);
}

/**
 * Lock this specific player
 */
function lock(sumId) {
  locksMap.set(sumId, true);
}

/**
 * Specific lock removed for this player
 */
function free(sumId) {
  locksMap.set(sumId, false);
}

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
    var sum = await teemo.searchSummonerByName(res.locals.name)
  } catch(error) {
    console.error(error);
    res.render('riotKO');
    return;
  }


  if (sum == null) {
    res.render('404Sum');
    return;
  } else if(typeof sum.id == 'undefined') {
    console.error('sum id undefined');
    res.render('error');
    return;
  }

  res.locals.sum = sum;
  promises.push(ddragonManager.manageProfileIcon(sum.profileIconId));


  sum.mainChampId = await teemo.getSumMain(sum.id).catch(err => console.log(err, err.stack)); 

  try {
    var dbSum = await dynamo.getSumBySummonerId(sum.id);
  } catch(err) {
    console.error(err, err.stack);
    res.render('error');
    return;
  } 

  if(dbSum == null) {
    dynamo.putNewSummoner(sum);
    await Promise.all(promises).catch(err => console.error(err, err.stack));
    console.log('new summoner: '+ sum.name);
    res.render('first_time');
    return;
  } 

  sum.rank = dbSum.rank;
  sum.wins = parseInt(dbSum.wins);
  sum.loss = parseInt(dbSum.loss);
  let lastTime = dbSum.lastGameTime+1;

  if(lastTime == null) {
    res.render('error');
    return;
  }

  let matches = [];

  //matchList must be fetched if the sum isn't locked
  if( !isLocked(sum.id) ) {
    lock(sum.id);
    matches = await teemo.getMatchList(sum.accountId, lastTime);

    // no new game => no need to keep the lock
    if (matches.length === 0)
      free(sum.id);
  }

  sum.history = [];

  let unchanged = true; //no need to update the db
  if(matches.length > 0) {
    unchanged = false; //new games => need to update the db
    let newMatches = await teemo.processAllMatches(matches, sum);
  } 
  else if (sum.wins + sum.loss == 0) {
    await promises;
    res.render('first_time');
    return;
  }

  if( !unchanged ) {
    await dynamo.updateSum(sum, dbSum.wins+dbSum.loss)
      .catch(errors => errors.forEach(err => console.error(err, err.stack)))
      .finally(free(sum.id)); //!unchanged => the lock was taken. Time to free it.
  } 

  let match2print = await dynamo.getSumHistory(dbSum.id)
                      .catch(err=>console.log(err, err.stack));

  match2print.reverse();
  sum.history2print = match2print;

  res.locals.rankString = league.rank2string(sum.rank, res.locals.__)

  sum.history2print.forEach(e => {
    promises.push(ddragonManager.manageChampionIcon(e.championName));
  });

  await Promise.all(promises).catch(err => console.error(err, err.stack));

  res.render('player');
}



function updatePlayer(dbSum) {

  return new Promise( async (resolve, reject) => {

    let sum = await teemo.searchSummonerByID(dbSum.id);

    if (sum == null) {
      let message = new Date().toISOString() + ' - summoner not found';
      reject(console.error(message));
      return;
    } else if(typeof sum.id == 'undefined') {
      let message = new Date().toISOString() + ' - an error occured with the teemo request';
      reject(console.error(message));
      return;
    }

    sum.mainChampId = await teemo.getSumMain(sum.id); 

    sum.rank = dbSum.rank;
    sum.wins = parseInt(dbSum.wins);
    sum.loss = parseInt(dbSum.loss);
    let lastTime = dbSum.lastGameTime +1;

    if(lastTime == null) {
      let message = new Date().toISOString() + ' - lastTime == null within the row';
      reject(console.error(message));
      return;
    }

    let matches = [];
    
    //Only get matches if player free
    if( !isLocked(sum.id) ) {
      lock(sum.id);
      matches = await teemo.getMatchList(sum.accountId, lastTime);
    
      // no new game => no need to lock
      if (matches.length === 0) 
        free(sum.id);
    }

    sum.history = [];

    let unchanged = true; //no need to update the db

    if(sum.name != dbSum.name) { //if the name changed, it will be necessary to update the DB
      unchanged = false;
      console.log(`A summoner changed his name: ${dbSum.name} -> ${sum.name}`);
    }

    if(sum.profileIconId != dbSum.profileIconId) { //if the profile icon changed, it will be necessary to update the DB
      unchanged = false;
      console.log(`A summoner changed his icon: ${dbSum.profileIconId} -> ${sum.profileIconId}`);
    }

    if(matches.length > 0) {
      unchanged = false; //new games => need to update the db
      let newMatches = await teemo.processAllMatches(matches, sum);
    }

    if( !unchanged )
      await dynamo.updateSum(sum, dbSum.wins + dbSum.loss)
        .catch(errors => errors.forEach(err => console.error(err, err.stack)))
        .finally(() => {
          //matches.length > 0 => the lock was taken and must be freed
          if(matches.length > 0) 
            free(sum.id);
        });
      resolve(sum);
  });
}



function updatePlayers() {
  
  return new Promise( async (resolve) => 
  {
    let dbUsers = await dynamo.getAllUsers();
    
    let updatePromises = [];

    dbUsers.forEach(e => {
      updatePromises.push(updatePlayer(e));
    });

    Promise.all(updatePromises).then(resolve(dbUsers));
  });
}

module.exports.updatePlayers = updatePlayers;
module.exports.searchPlayer = searchPlayer;