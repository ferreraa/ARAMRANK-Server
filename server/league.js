
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
      sum.rank.div = "0";
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
        sum.rank.div = "0";
    }
  }
}

//climb with league BO promote and 3 loss demote
function slowClimbing(sum, lp) {
  let maxLp = maxLeagueLP(sum.rank.league);
  sum.rank.lp = +sum.rank.lp + lp;
  if(sum.rank.lp >= maxLp) {
    sum.rank.lp = maxLp;
  } else if(sum.rank.lp < 0) {
      sum.rank.lp = "0";
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
    sum.rank.lp = "0";
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
    sum.rank.lp = +sum.rank.lp + lp; //manage the string number
    return;
  }

  if(sum.rank.div > 0) {
    sum.rank.div--;
    sum.rank.lp = demoteLP(sum.rank.league);
    return;
  }

  let currentBO = sum.rank.bo;
  let newBO = currentBO.replace('o', 'x');
  if(newBO == "xxx") {
    sum.rank.league--;
    sum.rank.lp = demoteLP(sum.rank.league);
    sum.rank.bo = "ooo";
    if(sum.rank.league == 0 || sum.rank.league > 5)
      sum.rank.div = "0";
    else 
      sum.rank.div = "2";
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
    sum.rank.div = "0";
    sum.rank.league++;
  } else if(nbLoss >= 2) {
    sum.rank.lp -= 15*(nbLoss-nbWins);
    sum.rank.bo = "ooo";
  }
  else {
    sum.rank.bo = newBO;
  }
}

//returns the message to be displayed as the rank of the player
function rank2string(rank) {
  let res = "";
  switch(rank.league) {
    case 0: res+="Challenger"; break;
    case 1: res+="Noob"; break;
    case 2: res+="Papier"; break;
    case 3: res+="Carton"; break;
    case 4: res+="Plâtre"; break;
    case 5: res+="Bois"; break;
    case 6: res+="Plastique"; break;
    case 7: res+="Grand Plastique"; break;
    case 8: res+="Bronze V"; break;
  }

  if(rank.league < 6 && rank.league > 0) {
    res += " " + RomanNumbers(3 - rank.div);
  }

  res += " - " + rank.lp + " lp";
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

module.exports.rank2string = rank2string;
module.exports.processLPchange = processLPchange;