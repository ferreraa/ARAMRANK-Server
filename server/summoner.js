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
    if (nb_of_games < 20) {
      R = 2;
      if (!match.win) {
        R = 1/R;
      }
    }
    else {
      R = getLeagueMultiplicator(sum.rank.league);
    }
  }

  let randomLP = Math.random() * 3 * R * (Math.random() > 0.5 ? 1 : -1);
  let Pf = 2.5 * match.poroFed ? 1 : -1;
  let kda = 0.5*(match.k - match.d + 0.2 * match.a);
  const mainFactor = sum.mainChampId == match.championId && match.win ? 2.5 : 1;
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


  //blackList
   switch (match.championId) {
    case 412: case 103: case 114: case 202: case 141: lp -= 5;
  }
  //noble list
  if (match.championId == 136) {
    lp += 3;
  }

  if(lp > 100)
    lp = 100;
  if(lp < -100)
    lp = -100;
  if (match.win && lp <= 0)
    lp = 1;
  else if (!match.win && lp>=0)
    lp = -1;

  //yuumi is a spectator. If the player decided to spectate, the game doesn't count.
  if (match.championId == 350) {
    lp = 0;
  } else {
    league.processLPchange(lp, sum, match, isPlacement);
  }

  match.lpValue = lp;
  sum.history.push(match);
}

function getLeagueMultiplicator(league) {
  switch(league) {
    case 0: return 2.0;
    case 1: return 1.9;
    case 2: return 1.8;
    case 3: return 1.7;
    case 4: return 1.5;
    case 5: return 1.3;
    case 6: return 1.0;
    case 7: return 0.7;
    case 8: return 0.5;
    default: return 1.0;
  }
}

module.exports.processGameResult = processGameResult;