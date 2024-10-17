'use strict';

const league = require("./league.js");
const {supportsCache} = require("./cache");

function processGameResult(sum, match) {
  const baseValue = 20;
  const nb_of_games = sum.wins + sum.losses; //number of games already played
  const isPlacement = nb_of_games < 5;

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
      R = getLeagueMultiplicator(sum.rank.league, match.win);
    }
  }

  let Pf

  // they deserve every snacks
  switch (match.poroSnacks) {
    case 0 : Pf = 2; break;
    case 1 : Pf = -1; break;
    case 2 : Pf = -2; break;
    default: Pf = 0;
  }

  let assistFactor = 0.2

  // if the player has a lot more assists than kills, a high kp and it's on our list
  // it must be a support
  let killParticipation = 0;
  if (match.teamKills > 0) {
    killParticipation = (match.k + match.a) / match.teamKills
    killParticipation = Math.round(killParticipation * 100) / 100;
  }

  if ((match.a * 3 > match.k) && killParticipation > 0.8 && supportsCache.has(match.championId)) {
    assistFactor = 0.5;
  }

  const kda = 0.5*(match.k - match.d + assistFactor * match.a);
  const mainFactor = sum.mainChampId === match.championId && match.win ? 2.5 : 1;
  const penta = match.pentaKills * 5;
  const fb = match.firstBlood ? 1.5 : 0;

  let lp = (R * baseValue) * mainFactor * winFactor;
  lp += kda + Pf + penta + fb;
  lp *= placementFactor;
  lp = Math.round(lp);

  if (match.win) {
    sum.wins++;
  } else {
    sum.losses++;
  }


  //blackList
  switch (match.championId) {
    case 412: case 103: case 114: case 202: case 141: lp -= 2;
  }
  //noble list, not noble anymore, it's broken
  if (match.championId == 136) {
    lp -= 3;
  }

  if (lp > 100)
    lp = 100;
  if (lp < -100)
    lp = -100;
  if (match.win && lp <= 0)
    lp = 1;
  else if (!match.win && lp>=0 && !isPlacement)
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

function getLeagueMultiplicator(league, win) {
  switch (league) {
    case 0: return win ? 2.0 : 1.8;
    case 1: return win ? 1.8 : 1.8;
    case 2: return win ? 1.6 : 1.65;
    case 3: return win ? 1.5 : 1.6;
    case 4: return win ? 1.3 : 1.45;
    case 5: return win ? 1.1 : 1.3;
    case 6: return win ? 0.8 : 1.0;
    case 7: return win ? 0.5 : 0.7;
    case 8: return win ? 0.4 : 0.5;
    default: return 1.0;
  }
}

module.exports.processGameResult = processGameResult;
