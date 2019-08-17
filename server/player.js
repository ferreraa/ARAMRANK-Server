const teemo = require("./teemo");
const dynamo = require("./dynamo");
const sumUtils = require("./summoner");
const league = require("./league");



async function searchPlayer(req, res) {
  let sum = await teemo.searchSummoner(res.locals.name);
  if (sum == null) {
    res.render('404Sum', res.locals);
    return;
  }

  res.locals.sum = sum;

  sum.mainChampId = await teemo.getSumMain(sum.id); 

  let dbSum = await dynamo.getSumByAccountId(sum.id);

  if(dbSum == null) {
    dynamo.putNewSummoner(sum);
    res.render('first_time', res.locals);
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
    res.render('first_time', res.locals);
  }

  if( !unchanged ) {
    dynamo.updateSum(sum);
  } 

  let match2print = dbSum.history.concat(sum.history);
  let l = match2print.length;
  if(l>20) {
    match2print = match2print.slice(l-19,19);
  }
  match2print.reverse();
  sum.history = match2print;
  res.locals.rankString = league.rank2string(sum.rank)
  res.render('player', res.locals);      
}


module.exports.searchPlayer = searchPlayer;