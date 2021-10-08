'use strict';

const sumUtils = require("./summoner.js");
const fs = require("fs");
const BEGINNING_OF_SEASON = require('./dynamo').BEGINNING_OF_SEASON;
const TeemoJS = require('teemojs');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const api = TeemoJS(process.env.RITO);


//search Summoner data from summoner name
function searchSummonerByName(name) {
  let data = api.get('euw1', 'summoner.getBySummonerName', name);
  return data;
}

//search Summoner data from summoner id
function searchSummonerByID(id) {
  let data = api.get('euw1', 'summoner.getBySummonerId', id);
  return data;
}

//Get highest mastery score champ by summoner Id
async function getSumMain(id) {
  let data = await api.get('euw1', 'championMastery.getAllChampionMasteries', id);
  if(data.length == 0)
    return -1;
  return data[0].championId;
}

//print MatchList by PUUID
function printMatchList(puuid) {
  let matches = api.get('europe', 'match.getMatchIdsByPUUID', puuid, {queue: 450})
    .then(data => console.log(matches[0]));
}

//get MatchList by PUUID since given last game id
async function getMatchList(puuid, lastGameId) {
  let result = [];

  let parameters = {
    queue: 450, //ARAM
    startTime: BEGINNING_OF_SEASON,
    start: 0,
    count: 3,
  };

  do {
    var matchList = await api.get('europe', 'match.getMatchIdsByPUUID', puuid, parameters);
    if(matchList == null)
      return [];

    let indexOfLastGame = matchList.indexOf(lastGameId);
    if (indexOfLastGame !== -1)
      matchList = matchList.slice(0, indexOfLastGame);

    result = result.concat(matchList);

    var againFlag = matchList.length === parameters.count;
    parameters.start = result.length;
    parameters.count = 100;
  } while (againFlag)

  return result;
}


async function processAllMatches(matches, sum) {
  let newMatches = await getAllMatches(matches, sum);

  let filteredMatches = newMatches.filter(el => {
    return el != null;
  });

  //reverse
  for (let i = filteredMatches.length - 1; i >= 0; i--) {
    sumUtils.processGameResult(sum, filteredMatches[i]);  
  }
}


function getAllMatches(matches, sum) {
  let res = [];

  matches.forEach(match => res.push(processMatch(match, sum)));

  return Promise.all(res);
}


async function processMatch(matchId, sum) {
  try {
    var match = await api.get('europe', 'match.getMatch', matchId);
  } catch (error) {
    console.error('processMatch error: ', error);
    return null;
  }

  if (match === null || match.info.gameDuration < 360)
    return null;

  let participant = match.info.participants.find(participant => participant.puuid === sum.puuid);
  if(typeof participant === 'undefined') {
    fs.appendFile('logs/processMatchLogs', (new Date()).toISOString() +
     '-could not find player ' + sum.name + ' in match ' + matchId , function (err) {
      if (err) throw err;
      console.log(new Date().toISOString() + '-could not find player '
        + sum.name + ' in match ' + matchId);
      }
    );
    return null;
  }

  let newMatch = {};
  newMatch.championId = participant.championId;
  newMatch.gameId = matchId;
  newMatch.timestamp = match.info.gameStartTimestamp + match.info.gameDuration;

  newMatch.championName = participant.championName;

  newMatch.pentaKills = participant.pentaKills;
  newMatch.win = participant.win;
  newMatch.k = participant.kills;
  newMatch.d = participant.deaths;
  newMatch.a = participant.assists;
  newMatch.firstBlood = participant.firstBloodKill;
  newMatch.poroFed = participant.item6 == 0;
  return newMatch;
}


module.exports.searchSummonerByID = searchSummonerByID;
module.exports.searchSummonerByName = searchSummonerByName;
module.exports.getSumMain = getSumMain;
module.exports.printMatchList = printMatchList;
module.exports.getMatchList = getMatchList;
module.exports.processAllMatches = processAllMatches;