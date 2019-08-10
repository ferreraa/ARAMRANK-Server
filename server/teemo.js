/*const {DDragon, Pyke} = require('pyke');

const pyke = new Pyke('RGAPI-d7f09129-6464-4a1f-b3bd-371be842b491', "10");
  
function searchSummoner (name) {
  pyke.summoner.getBySummonerName(name, "euw1").then(data => {
  console.log(`Summoner Name is : ${data.name}, and level is : ${data.summonerLevel}`);
}).catch(console.error);
}*/
var sumUtils = require("summoner.js");
const fs = require("fs");


const TeemoJS = require('teemojs');
let api = TeemoJS('RGAPI-b0d538b9-6197-4b7e-ba14-4526e07459e0');

//search Summoner data from summoner name
function searchSummoner(name) {
  let data = api.get('euw1', 'summoner.getBySummonerName', name);
  return data;
}

//Get highest mastery score champ by summoner Id
async function getSumMain(id) {
  let data = await api.get('euw1', 'championMastery.getAllChampionMasteries', id);
  return data[0].championId;
}

//print MatchList by account Id
function printMatchList(Accountid) {
  let data = api.get('euw1', 'match.getMatchlist', Accountid, {queue: 450})
    .then(data => console.log(data.matches[0]));
}

//get MatchList by account Id since given beginTime
async function getMatchList(Accountid, beginTime) {
  //warning, make sure of the time format (string vs number)
  let data = await api.get('euw1', 'match.getMatchlist', Accountid, {queue: 450, beginTime: beginTime, season: 13});
  return data.matches;
}


async function processAllMatches(matches, sum) {
  let newMatches = await getAllMatches(matches, sum);

  var filteredMatches = newMatches.filter(function (el) {
    return el != null;
  });

  for (let i = filteredMatches.length - 1; i >= 0; i--) {
    sumUtils.processGameResult(sum, filteredMatches[i]); //incomplete function
    
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

  if(data.gameDuration < 360) {
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

  let stats = data.participants[i].stats;
  newMatch.win = stats.win;
  newMatch.k = stats.kills;
  newMatch.d = stats.deaths;
  newMatch.a = stats.assists;
  newMatch.firstBlood = stats.firstBloodKill;
  newMatch.poroFed = stats.item6 == 0;
  return newMatch;
}

// Get C9 Sneaky's games on Ezreal and Kalista for a particular season.
//api.get('na1', 'match.getMatchlist', 78247, { champion: [81, 429], season: 8 })
//  .then(...);

//MatchDto.gameDuration (long)
//MatchDto.participants[].championId (int)
//MatchDto.participantIdentities[].player.summonerId (string)
//MatchDto.participantIdentities[].stats.win (boolean)
//MatchDto.participantIdentities[].stats.kills (int)
//MatchDto.participantIdentities[].stats.item6 (int)
//MatchDto.participantIdentities[].stats.firstBloodKill (boolean)
//MatchDto.participantIdentities[].stats.pentaKills (int)
//MatchDto.participantIdentities[].stats.deaths (int)
//MatchDto.participantIdentities[].stats.assists (int)


module.exports.searchSummoner = searchSummoner;
module.exports.getSumMain = getSumMain;
module.exports.printMatchList = printMatchList;
module.exports.getMatchList = getMatchList;
module.exports.processAllMatches = processAllMatches;