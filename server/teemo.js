var sumUtils = require("./summoner.js");
const fs = require("fs");
const champJSON = require("./champJSONManager");

const TeemoJS = require('teemojs');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const api = TeemoJS(process.env.RITO);


//search Summoner data from summoner name
function searchSummoner(name) {
  let data = api.get('euw1', 'summoner.getBySummonerName', name);
  return data;
}

//Get highest mastery score champ by summoner Id
async function getSumMain(id) {
  let data = await api.get('euw1', 'championMastery.getAllChampionMasteries', id);
  if(data.length == 0)
    return -1;
  return data[0].championId;
}

//print MatchList by account Id
function printMatchList(Accountid) {
  let data = api.get('euw1', 'match.getMatchlist', Accountid, {queue: 450})
    .then(data => console.log(data.matches[0]));
}

//get MatchList by account Id since given beginTime
async function getMatchList(Accountid, beginTime) {
  let result = [];
  let parameters = {
    queue: 450, //ARAM
    beginTime: beginTime,
    season: 13, //season 2019
  }
  do{
    let data = await api.get('euw1', 'match.getMatchlist', Accountid, parameters);
    if(data == null)
      return [];
    var nb_matches = data.matches.length;
    if(nb_matches == 100)
      parameters.beginIndex = data.endIndex+1;

    result = result.concat(data.matches);    

  } while(nb_matches == 100)

  return result;
}


async function processAllMatches(matches, sum) {
  let newMatches = await getAllMatches(matches, sum);

  var filteredMatches = newMatches.filter(function (el) {
    return el != null;
  });

  //reverse 
  for (let i = filteredMatches.length - 1; i >= 0; i--) {
    sumUtils.processGameResult(sum, filteredMatches[i]);  
  }

}


function getAllMatches(matches, sum) {
  let res = Array();

  for (let i = matches.length - 1; i >= 0; i--) {
    res[i] = processMatch(matches[i], sum)
  }

  return Promise.all(res);
}

async function processMatch(match, sum) {
  let data = await api.get('euw1', 'match.getMatch', match.gameId);

  if(data == null || data.gameDuration < 360) {
    return null;
  }

  let i = -1;
  for (let j = data.participantIdentities.length - 1; j >= 0; j--) {
    if(data.participantIdentities[j].player.summonerId == sum.id) {
      i = j;
      break;
    }
  }

  if(i == -1) {
    fs.appendFile('logs/processMatchLogs', (new Date()).toISOString() +
     '-could not find player '+sum.name+' in match '+match.gameId , function (err) {
    if (err) throw err;
    console.log((new Date()).toISOString() + 'Error logged in logs/processMatchLogs!');
    });
    return null;
  }

  let newMatch = {};
  newMatch.championId = data.participants[i].championId;
  newMatch.gameId = match.gameId;
  newMatch.timestamp = data.gameCreation;

  newMatch.championName = champJSON.getChampName(newMatch.championId);

  let stats = data.participants[i].stats;
  newMatch.pentaKills = stats.pentaKills;
  newMatch.win = stats.win;
  newMatch.k = stats.kills;
  newMatch.d = stats.deaths;
  newMatch.a = stats.assists;
  newMatch.firstBlood = stats.firstBloodKill;
  newMatch.poroFed = stats.item6 == 0;
  return newMatch;
}


module.exports.searchSummoner = searchSummoner;
module.exports.getSumMain = getSumMain;
module.exports.printMatchList = printMatchList;
module.exports.getMatchList = getMatchList;
module.exports.processAllMatches = processAllMatches;