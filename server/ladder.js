'use strict';

const db = require('./dynamo'),
  league = require('./league'),
  fs = require("fs");

const path = './server/ladder.json';

/** Retrieve all the players, filter out those who played < 5 games and sort them.
/*  update ./server/ladder.json, which will be used to render the Ladder page.
/*  @param users List of players to sort by rank. If not provided, the database users will be taken
*/
async function updateLadder(users = null) {
  let list = users;
  if(list == null)
    list = await db.getAllUsers();
  list = list.filter((sum) => {
    return sum.wins + sum.loss >= 5;
  }).sort((sum1, sum2) => {
    return league.compare(sum1.rank, sum2.rank) == 1 ? -1 : 1;
  })

  let data2write = [];

  list.forEach(e => {
    let e2write = { 
      iconId: e.profileIconId,
      rank: e.rank,
      name: e.name,
      //badges: e.badges
    };

    data2write.push(e2write);
  });

  data2write = JSON.stringify(data2write);

  try {
    fs.writeFileSync(path, data2write);
  } catch( error ) {
    console.error(error);
  }
}


function readLadder() {
  try {
    var data = fs.readFileSync(path);
  }
  catch( error ) {
    console.error(error);
  }

  return JSON.parse(data);

}

module.exports.readLadder = readLadder;
module.exports.updateLadder = updateLadder;
