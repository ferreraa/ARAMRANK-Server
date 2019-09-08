const teemo = require("./teemo");
const dynamo = require("./dynamo");
const sumUtils = require("./summoner");
const league = require("./league");
const ddragonManager = require("./ddragonManager");
  
async function searchPlayer(req, res) {
  let sum = await teemo.searchSummoner(res.locals.name);

  if (sum == null) {
    res.render('404Sum');
    return;
  } else if(typeof sum.id == 'undefined') {
    res.render('error');
    return;
  }

  res.locals.sum = sum;
  await ddragonManager.manageProfileIcon(sum.profileIconId);


  sum.mainChampId = await teemo.getSumMain(sum.id); 

  let dbSum = await dynamo.getSumByAccountId(sum.id);

  if(dbSum == null) {
    dynamo.putNewSummoner(sum);
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
    res.render('first_time');
    return;
  }

  if( !unchanged ) {
    dynamo.updateSum(sum);
  } 

  let match2print = dbSum.history.concat(sum.history);
  let l = match2print.length;
  if(l>20) {
    match2print = match2print.slice(l-19,l);
  }
  match2print.reverse();
  sum.history = match2print;


  res.locals.rankString = league.rank2string(sum.rank, res.locals.__)

  let iconDownloadPromises = [];
  sum.history.forEach(e => {
    iconDownloadPromises.push(ddragonManager.manageChampionIcon(e.championName));
  });
  await Promise.all(iconDownloadPromises);
  res.render('player');      
}


module.exports.searchPlayer = searchPlayer;