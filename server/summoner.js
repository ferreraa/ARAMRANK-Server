'use strict';

const league = require("./league.js");

function processGameResult(sum, match) {

  let nb_of_games = sum.wins + sum.loss; //number of games already played
  let isPlacement = nb_of_games < 5;

  let winFactor = match.win ? 1 : -1;
  //win => 1. Lose => -1 if not placements

  let placementFactor = 1;
  switch (nb_of_games) {
    case 0: case 1: placementFactor = 3.5; break;
    case 2: case 3: placementFactor = 2.7; break;
    case 4: placementFactor = 2; break;
  }
  if (!match.win && isPlacement)
    placementFactor = 0; 


  let R = 1;
  if (!isPlacement) {
    if(nb_of_games <20)
      R=2;
    else
      R = sum.loss > 0 ? Math.max(Math.min(2*sum.wins/nb_of_games, 2),0.5) : 2;
    if(!match.win)
      R = 1/R;
  }

  let randomLP = Math.random() * 3 * R * (Math.random() > 0.5 ? 1 : -1);
  let Pf = 2.5 * match.poroFed ? 1 : -1;
  let kda = 0.5*(match.k - match.d + 0.2 * match.a);
  let mainFactor = sum.mainChampId == match.championId && match.win ? 2.5 : 1;
  let penta = match.pentaKills * 5;
  let fb = match.firstBlood ? 3 : 0;

  let lp = (R*20 + randomLP) * mainFactor * winFactor;
  lp += kda + Pf + penta + fb;
  lp *= placementFactor;
  lp = Math.round(lp);

  if (match.win) {
    sum.wins++;
  } else {
    sum.loss++;
  }


  if( match.win )
  { //blackList
     switch(match.championId) {
      case 412: case 103: case 114: case 202: case 141: lp = 1;  
    }
  }

  if(lp > 100)
    lp = 100;
  if(lp < -100)
    lp = -100;
  if ((match.win && lp<0) || (!match.win && lp>0))
    lp=0;

  //yuumi is a spectator. If the player decided to spectate, the game doesn't count.
  if (match.championId == 350) {
    lp=0;
  } else {
    league.processLPchange(lp, sum, match, isPlacement);
  }

  match.lpValue = lp;
  sum.history.push(match);
}




function getLastTimeStamp(dbSum) {
	var timestamp = 1578632400000; //begining of S10
	let length = dbSum.history.length;

	if(length > 0)
		timestamp = dbSum.history[length-1].timestamp;

	return timestamp;
}

module.exports.getLastTimeStamp = getLastTimeStamp;
module.exports.processGameResult = processGameResult;