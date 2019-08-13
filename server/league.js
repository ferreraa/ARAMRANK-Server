
function processLPchange(lp, sum, match, isPlacement) {
  let win = match.win;

  //manage promote BO
  if( sum.rank.lp.N == maxLeagueLP(sum.rank.league.N) ) {
    promoUpdate(win, sum);
  } //manageDemoteBO
  else if (sum.rank.league.N > 0 && sum.rank.lp.N == 0) {
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
  if(sum.rank.league.N == 0 || sum.rank.league.N > 5) {
    return true;
  } else {
    return sum.rank.div.N == 2;
  }
}

function needDemoteBO(sum) {
  return sum.rank.div.N == 0;
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
  if(sum.rank.league.N == 0
    || sum.rank.league.N == 6
    || sum.rank.league.N == 7)
    sum.rank.league.N++;
  else {
    if(sum.rank.div.N == 2) {
      sum.rank.league.N++;
      sum.rank.div.N = "0";
    } else 
      sum.rank.div.N++;
  }
}

function demote(sum) {
  if(sum.rank.league.N > 0) {
    if(sum.rank.div.N > 0)
      sum.rank.div.N--;
    else {
      sum.rank.league.N--;
      if(sum.rank.league.N == 0)
        sum.rank.div.N = "0";
    }
  }
}

//climb with league BO promote and 3 loss demote
function slowClimbing(sum, lp) {
  let maxLp = maxLeagueLP(sum.rank.league.N);
  sum.rank.lp.N = +sum.rank.lp.N + lp;
  if(sum.rank.lp.N >= maxLp) {
    sum.rank.lp.N = maxLp;
  } else if(sum.rank.lp.N < 0) {
      sum.rank.lp.N = "0";
  }
}




//climb with division promote/demote and placements promote
function fastClimbing(sum, lp) {
  let maxLp = maxLeagueLP(sum.rank.league.N);
  sum.rank.lp.N = +sum.rank.lp.N + lp;
  if(sum.rank.lp.N >= maxLp) {
    sum.rank.lp.N -= maxLp;
    promote(sum);
  } else if(sum.rank.lp.N < 0) {
    sum.rank.lp.N = "0";
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
    sum.rank.bo.S = "ooo";
    sum.rank.lp.N = +sum.rank.lp.N + lp; //manage the string number
    return;
  }

  if(sum.rank.div.N > 0) {
    sum.rank.div.N--;
    sum.rank.lp.N = demoteLP(sum.rank.league.N);
    return;
  }

  let currentBO = sum.rank.bo.S;
  let newBO = currentBO.replace('o', 'x');
  if(newBO == "xxx") {
    sum.rank.league.N--;
    sum.rank.lp.N = demoteLP(sum.rank.league.N);
    sum.rank.bo.S = "ooo";
    if(sum.rank.league.N == 0 || sum.rank.league.N > 5)
      sum.rank.div.N = "0";
    else 
      sum.rank.div.N = "2";
  } else {
    sum.rank.bo.S = newBO;
  }
}


function promoUpdate(win, sum) {
  let currentBO = sum.rank.bo.S;
  let newBO = currentBO.replace('o', win?'v':'x');
  let nbWins = (newBO.split('v').length - 1);
  let nbLoss = (newBO.split('x').length - 1);
  if(nbWins >= 2) {
    sum.rank.lp.N = 0;
    sum.rank.bo.S = "ooo";
    sum.rank.div.N = "0";
    sum.rank.league.N++;
  } else if(nbLoss >= 2) {
    sum.rank.lp.N -= 15*(nbLoss-nbWins);
    sum.rank.bo.S = "ooo";
  }
  else {
    sum.rank.bo.S = newBO;
  }
}


module.exports.processLPchange = processLPchange;