'use strict';

function processLPchange(lp, sum, match, isPlacement) {
  let win = match.win;

  //manage promote BO
  if( sum.rank.lp == maxLeagueLP(sum.rank.league) ) {
    promoUpdate(win, sum);
  } //manageDemoteBO
  else if (sum.rank.league > 0 && sum.rank.lp == 0) {
    demoteUpdate(win, sum, lp); 
  } 
  else if(isPlacement)
    fastClimbing(sum,lp); //can't be demoted anyway
  else {
    if(win) {
      if( needPromoteBO(sum) )
        slowClimbing(sum, lp);
      else 
        fastClimbing(sum, lp);
    }//lose
    else {
      if( needDemoteBO(sum) )
        slowClimbing(sum, lp);
      else
        fastClimbing(sum, lp);
    } 
  }
}
  

function needPromoteBO(sum) {
  if(sum.rank.league == 0 || sum.rank.league > 5) {
    return true;
  } else {
    return sum.rank.div == 2;
  }
}

function needDemoteBO(sum) {
  return sum.rank.div == 0;
}


function maxLeagueLP(league) {
  if(league < 6)
    return 100;
  else if(league == 6)
    return 150;
  else if(league == 7)
    return 300;
  else
    return Infinity;
}

function promote(sum) {
  if(sum.rank.league == 0
    || sum.rank.league == 6
    || sum.rank.league == 7)
    sum.rank.league++;
  else {
    if(sum.rank.div == 2) {
      sum.rank.league++;
      sum.rank.div = 0;
    } else 
      sum.rank.div++;
  }
}

function demote(sum) {
  if(sum.rank.league > 0) {
    if(sum.rank.div > 0)
      sum.rank.div--;
    else {
      sum.rank.league--;
      if(sum.rank.league == 0)
        sum.rank.div = 0;
    }
  }
}

//climb with league BO promote and 3 losses demote
function slowClimbing(sum, lp) {
  let maxLp = maxLeagueLP(sum.rank.league);
  sum.rank.lp = +sum.rank.lp + lp;
  if(sum.rank.lp >= maxLp) {
    sum.rank.lp = maxLp;
  } else if(sum.rank.lp < 0) {
      sum.rank.lp = 0;
  }
}




//climb with division promote/demote and placements promote
function fastClimbing(sum, lp) {
  let maxLp = maxLeagueLP(sum.rank.league);
  sum.rank.lp = +sum.rank.lp + lp;
  if(sum.rank.lp >= maxLp) {
    sum.rank.lp -= maxLp;
    promote(sum);
  } else if(sum.rank.lp < 0) {
    sum.rank.lp = 0;
  }
}

//return the new lp after being demoted
function demoteLP(league) {
  if(league < 6)
    return 75;
  else if(league == 6) 
    return 100;
  else if(league == 7)
    return 200;
}

function demoteUpdate(win, sum, lp) {
  if(win) {
    sum.rank.bo = "ooo";
    if(needPromoteBO(sum)) {
      slowClimbing(sum, lp);
    } else {
      fastClimbing(sum, lp);
    }
    return;
  }

  if(sum.rank.div > 0) {
    sum.rank.div--;
    sum.rank.lp = demoteLP(sum.rank.league);
    return;
  }

  let newBO = sum.rank.bo.replace('o', 'x');
  if(newBO == "xxx") {
    sum.rank.league--;
    sum.rank.lp = demoteLP(sum.rank.league);
    sum.rank.bo = "ooo";
    if(sum.rank.league == 0 || sum.rank.league > 5)
      sum.rank.div = 0;
    else 
      sum.rank.div = 2;
  } else {
    sum.rank.bo = newBO;
  }
}


function promoUpdate(win, sum) {
  let currentBO = sum.rank.bo;
  let newBO = currentBO.replace('o', win?'v':'x');
  let nbWins = (newBO.split('v').length - 1);
  let nbLoss = (newBO.split('x').length - 1);
  if(nbWins >= 2) {
    sum.rank.lp = 0;
    sum.rank.bo = "ooo";
    sum.rank.div = 0;
    sum.rank.league++;
  } else if(nbLoss >= 2) {
    sum.rank.lp -= 15*(nbLoss-nbWins);
    sum.rank.bo = "ooo";
  }
  else {
    sum.rank.bo = newBO;
  }
}

/** returns true if the first given rank is higher or equal to the second
 * @rank1 rank of first player
 * @rank2 rank of second player
 */
function compare(rank1, rank2) {
  if(rank1.league < rank2.league)
    return -1;
  else if(rank1.league > rank2.league)
    return 1;

  if(rank1.div < rank2.div)
    return -1;
  else if(rank1.div > rank2.div)
    return 1;

  return rank1.lp < rank2.lp ? -1 : 1;
}

/* returns the message to be displayed as the rank of the player
 * @rank is the rank object from the sum object
 * @t is the translate function res.locals.__()
 */
function rank2string(rank, t) {
  let res = '';
  switch(rank.league) {
    case 0: res+=t('Challenger'); break;
    case 1: res+=t('Noob'); break;
    case 2: res+=t('Papier'); break;
    case 3: res+=t('Carton'); break;
    case 4: res+=t('Plâtre'); break;
    case 5: res+=t('Bois'); break;
    case 6: res+=t('Plastique'); break;
    case 7: res+=t('Grand Plastique'); break;
    case 8: res+=t('Bronze V'); break;
  }

  if(rank.league < 6 && rank.league > 0) {
    res += ' ' + RomanNumbers(3 - rank.div);
  }

  res += ' - ' + rank.lp + ' LP ';

  if(rank.lp == maxLeagueLP(rank.league)) {
    let bo3w = rank.bo.split('v').length - 1;
    let bo3l = rank.bo.split('x').length -1;
    res += ' - BO3: ' + bo3w + ' - ' + bo3l;
  }
  return res;
}


function RomanNumbers(arabNum) {
  switch(arabNum) {
    case 1: return "I";
    case 2: return "II";
    case 3: return "III";
    case 4: return "IV";
    case 5: return "V";
    case 6: return "VI";
    case 7: return "VII";
    case 8: return "VIII";
    case 9: return "IX";
    case 10: return "X";
    default: return arabNum.toString();
  }
}

function getRankIconSrc(rank) {
  switch(rank.league) {
    case 0: return ""; break;

    case 1:
      switch(rank.div) {
        case 0: return "/img/noob-3.png";
        case 1: return "/img/noob-2.png";
        case 2: return "/img/noob-1.png";
      }
    case 2:
      switch(rank.div) {
        case 0: return "/img/paper-3.png";
        case 1: return "/img/paper-2.png";
        case 2: return "/img/paper-1.png";
      }
    case 3:
      switch(rank.div) {
        case 0: return "/img/cardboard-3.svg";
        case 1: return "/img/cardboard-2.svg";
        case 2: return "/img/cardboard-1.png";
      }
    case 4:
      switch(rank.div) {
        case 0: return "/img/plaster-3.png";
        case 1: return "/img/plaster-2.png";
        case 2: return "/img/plaster-1.png";
      }
    case 5:
      switch(rank.div) {
        case 0: return "/img/wood-3.png";
        case 1: return "/img/wood-2.png";
        case 2: return "/img/wood-1.png";
      }
    case 6:
      return "/img/plastic-1.svg";
    case 7:
      return "/img/plastic-3.svg";
    case 8:
      return "/img/bronze_5.png";
  }
}

module.exports.getRankIconSrc = getRankIconSrc;
module.exports.compare = compare;
module.exports.rank2string = rank2string;
module.exports.processLPchange = processLPchange;