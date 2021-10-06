'use strict';

const db = require('./dynamo'),
  league = require('./league'),
  fs = require("fs");

const path = './server/ladder.json';

var ladder = null;

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

  ladder = data2write;
  data2write = JSON.stringify(data2write);

  try {
    fs.writeFileSync(path, data2write);
  } catch( error ) {
    console.error(error);
  }
}

function getLength() {
  if (ladder === null) 
    return 0;
  return ladder.length ?? 0;
}

function getLadderPage(page, pageSize) {
  let indexA = (page - 1) * pageSize;
  let indexB = page * pageSize;
  return ladder.slice(indexA, indexB);
}

function readLadder(page, pageSize) {
  if (ladder !== null)
    return getLadderPage(page, pageSize);
  
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (err, data) => {
      if (err) 
        reject(err);
      else {
        ladder = JSON.parse(data);
        resolve(getLadderPage(page, pageSize));
      }
    });
  });
}

module.exports.getLength = getLength;
module.exports.readLadder = readLadder;
module.exports.updateLadder = updateLadder;
