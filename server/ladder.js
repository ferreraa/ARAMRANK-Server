const db = require('./dynamo'),
  league = require('./league'),
  fs = require("fs");

const path = './server/ladder.json';

async function updateLadder() {
  list = await db.getAllUsers();
  list = list.filter((sum) => {
    return sum.wins + sum.loss >= 5;
  }).sort((sum1, sum2) => {
    return league.compare(sum1.rank, sum2.rank) == 1 ? -1 : 1;
  })

  let data2write = [];

  list.forEach(e => {
    e2write = { 
      iconId: e.profileIconId,
      rank: e.rank,
      name: e.name,
      badges: e.badges
    };

    data2write.push(e2write);
  });

  data2write = JSON.stringify(data2write);

  try {
    fs.writeFileSync(path, data2write);/*, err => {
      if(err) console.log(err);
      else console.log("ladder.json updated");
    });*/
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
