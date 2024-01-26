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
  const promises = [];

  try {
    const playerAccount = await teemo.searchRiotAccountByName(res.locals.name, res.locals.tag);
    if (playerAccount === null) {
      res.render('404Sum');
      return;
    }
    var summoner = await teemo.searchSummonerByPUUID(playerAccount.puuid);
    summoner.name = `${playerAccount.gameName}#${playerAccount.tagLine}`;
  } catch(error) {
    console.error(error);
    res.render('riotKO');
    return;
  }

  if (summoner === null) {
    console.error('summoner not found despite account existing with tagline');
    res.render('404Sum');
    return;
  } else if (summoner.puuid === undefined) {
    console.error('account puuid undefined');
    res.render('error');
    return;
  }

  res.locals.sum = summoner;
  promises.push(ddragonManager.manageProfileIcon(summoner.profileIconId));

  try {
    summoner.mainChampId = await teemo.getChampionWithHighestMastery(summoner.puuid);
    var dbSum = await dynamo.getSumBySummonerPUUID(summoner.puuid);
  } catch (err) {
    console.error(err, err.stack);
    res.render('error');
    return;
  }

  if (dbSum === null) {
    dynamo.putNewSummoner(summoner)
      .then(dbSum => updatePlayer(dbSum, summoner))
      .catch(console.error);
    await Promise.all(promises).catch(console.error);
    console.log('new summoner: '+ summoner.name);
    res.render('first_time');
    return;
  }

  try {
    var databasePlayerItem = await updatePlayer(dbSum, summoner);
  } catch (error) {
    console.error(error);
    res.render('error');
    return;
  }

  if (databasePlayerItem.wins + databasePlayerItem.losses === 0) {
    await Promise.all(promises).catch(console.error);
    res.render('first_time');
    return;
  }

  const match2print = [...dbSum.history];

  match2print.reverse();
  databasePlayerItem.history2print = match2print;

  res.locals.rankString = league.rank2string(databasePlayerItem.rank, res.locals.__)
  res.locals.rankIconSrc = league.getRankIconSrc(databasePlayerItem.rank);

  databasePlayerItem.history2print.forEach(e => {
    promises.push(ddragonManager.manageChampionIcon(e.championName));
  });

  await Promise.all(promises).catch(err => console.error(err, err.stack));

  res.render('player');
}

function updatePlayer(dbSum, sum = null) {
  return new Promise(async (resolve, reject) => {
    const riotAccountPromise = teemo.searchRiotAccountByPUUID(dbSum.puuid);
    sum = sum ?? await teemo.searchSummonerByPUUID(dbSum.puuid);

    if (sum == null) {
      dynamo.removePlayer(dbSum.puuid);
      reject(`${new Date().toISOString()} - summoner ${dbSum.name}/${dbSum.puuid} not found. Removing it from DB`);
      return;
    } else if (sum?.puuid === undefined) {
      reject(new Date().toISOString() + ' - an error occured with the teemo request');
      return;
    }

    if (sum?.history === undefined) {
      sum.history = dbSum.history;
    }

    sum.mainChampId = sum.mainChampId ?? await teemo.getChampionWithHighestMastery(sum.puuid).catch(reject);

    sum.rank = dbSum.rank;
    sum.wins = parseInt(dbSum.wins);
    sum.losses = parseInt(dbSum.losses);
    const lastGameId = dbSum.lastGameId;

    if (lastGameId === null || lastGameId === undefined) {
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

    let mustUpdatePlayer = false;

    riotAccountPromise.then((riotAccount) => {
      sum.name = `${riotAccount.gameName}#${riotAccount.tagLine}`;
      if (dbSum.name !== sum.name) {
        mustUpdatePlayer = true;
        sum.name = sum.name;
        console.log(`A summoner changed his name: ${dbSum.name} -> ${sum.name}`);
      }
    }).catch((error) => console.log('error when fetching riotAccount: ', error));

    if (sum.profileIconId !== dbSum.profileIconId) { //if the profile icon changed, it will be necessary to update the DB
      mustUpdatePlayer = true;
      console.log(`A summoner changed his icon: ${dbSum.profileIconId} -> ${sum.profileIconId}`);
    }

    if (matches.length > 0) {
      await teemo.processAllMatches(matches, sum);
      sum.history = sum.history.slice(-dynamo.maxHistorySize);
      mustUpdatePlayer = true; //new games => need to update the db
    }

    if (await riotAccountPromise && mustUpdatePlayer) {
      await dynamo.updateSum(sum, lastGameId)
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
      const dbUsers = await dynamo.getAllUsers(false);
      const updatePromises = dbUsers.map((dbUser) => updatePlayer(dbUser));

      Promise.allSettled(updatePromises)
        .then((updatedSummoners) => {
          const onlyValidSummoners = updatedSummoners.filter(promise => promise.status === 'fulfilled').map(fulfilledPromise => fulfilledPromise.value);
          resolve(onlyValidSummoners);
        })
        .catch(reject);
    }
  );
}

module.exports.updatePlayers = updatePlayers;
module.exports.searchPlayer = searchPlayer;