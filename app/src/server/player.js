'use strict';

const teemo = require("./teemo");
const dynamo = require("./dynamo");
const league = require("./league");
const ddragonManager = require("./ddragonManager");

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

  try {
    sum.mainChampId = await teemo.getChampionWithHighestMastery(sum.puuid);
    var dbSum = await dynamo.getSumBySummonerId(sum.id);
  } catch (err) {
    console.error(err, err.stack);
    res.render('error');
    return;
  }

  if (dbSum === null) {
    dynamo.putNewSummoner(sum)
      .then(dbSum => updatePlayer(dbSum, sum))
      .catch(console.error);
    await Promise.all(promises).catch(console.error);
    console.log('new summoner: '+ sum.name);
    res.render('first_time');
    return;
  }

  try {
    sum = await updatePlayer(dbSum, sum);
  } catch (error) {
    console.error(error);
    res.render('error');
    return;
  }

  if (sum.wins + sum.loss === 0) {
    await Promise.all(promises).catch(console.error);
    res.render('first_time');
    return;
  }

  let match2print = await dynamo.getSumHistory(dbSum.id)
                      .catch(console.error);

  match2print.reverse();
  sum.history2print = match2print;

  res.locals.rankString = league.rank2string(sum.rank, res.locals.__)
  res.locals.rankIconSrc = league.getRankIconSrc(sum.rank);

  sum.history2print.forEach(e => {
    promises.push(ddragonManager.manageChampionIcon(e.championName));
  });

  await Promise.all(promises).catch(err => console.error(err, err.stack));

  res.render('player');
}


function updatePlayer(dbSum, sum = null) {
  return new Promise(async (resolve, reject) => {
    sum = sum ?? await teemo.searchSummonerByID(dbSum.id);

    if (sum == null) {
      reject(new Date().toISOString() + ' - summoner not found');
      return;
    } else if(typeof sum.id == 'undefined') {
      reject(new Date().toISOString() + ' - an error occured with the teemo request');
      return;
    }

    sum.mainChampId = sum.mainChampId ?? await teemo.getChampionWithHighestMastery(sum.puuid).catch(reject);

    sum.rank = dbSum.rank;
    sum.wins = parseInt(dbSum.wins);
    sum.loss = parseInt(dbSum.loss);
    let lastGameId = dbSum.lastGameId;

    if (lastGameId == null) {
      reject(new Date().toISOString() + ' - lastGameId == null within the row');
      return;
    }

    let matches = [];

    //Only get matches if player free
    if (!isLocked(sum.id)) {
      lock(sum.id);
      matches = await teemo.getMatchList(sum.puuid, lastGameId);

      // no new game => no need to lock
      if (matches.length === 0) 
        free(sum.id);
    }

    let unchanged = true; //no need to update the db

    if (sum.name != dbSum.name) { //if the name changed, it will be necessary to update the DB
      unchanged = false;
      console.log(`A summoner changed his name: ${dbSum.name} -> ${sum.name}`);
    }

    if (sum.profileIconId != dbSum.profileIconId) { //if the profile icon changed, it will be necessary to update the DB
      unchanged = false;
      console.log(`A summoner changed his icon: ${dbSum.profileIconId} -> ${sum.profileIconId}`);
    }

    sum.history = [];

    if (matches.length > 0) {
      await teemo.processAllMatches(matches, sum);
      unchanged = false; //new games => need to update the db
    }

    if (!unchanged) {
      await dynamo.updateSum(sum, dbSum.wins + dbSum.loss)
        .catch(reject)
        .finally(() => {
          //matches.length > 0 => the lock was taken and must be freed
          if (isLocked(sum.id))
            free(sum.id);
        });
      }
      resolve(sum);
  });
}


function updatePlayers() {
  
  return new Promise(async (resolve, reject) => 
    {
      const dbUsers = await dynamo.getAllUsers();
      
      const updatePromises = dbUsers.map(updatePlayer);

      Promise.all(updatePromises)
        .then(resolve(dbUsers))
        .catch(reject);
    }
  );
}

module.exports.updatePlayers = updatePlayers;
module.exports.searchPlayer = searchPlayer;