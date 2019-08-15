const https = require('https');
const fs = require('fs');

function createNewMyChampionJS(championJS) {
  let data2write = {};
  data2write.version = championJS.version;
  data2write.champions = new Object();

  for(const [k,v] of Object.entries(championJS.data)) {
    data2write.champions[v.key] = v.id;
  }

  fs.writeFile('./server/champ.json', JSON.stringify(data2write),
   function(){ console.log("new champ.json file"); });

}

function readMyChampionJS() {
  let jsonString = fs.readFileSync('./server/champ.json')

  return JSON.parse(jsonString);

}


function rewriteChampJSON(ver) {
  https.get('https://ddragon.leagueoflegends.com/cdn/'+ver+'/data/en_US/champion.json', (resp) => {
  let data = '';

  // A chunk of data has been recieved.
  resp.on('data', (chunk) => {
    data += chunk;
  });

  // The whole response has been received. Print out the result.
  resp.on('end', () => {
    createNewMyChampionJS(JSON.parse(data));
  });

  }).on("error", (err) => {
    console.log("Error: " + err.message);
  });
}


function remoteVersion() {
  return new Promise((resolve, reject) => {
    https.get('https://ddragon.leagueoflegends.com/api/versions.json', (resp) => {
      let data = new Array();

      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data.push(chunk);
      });

      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        resolve(JSON.parse(data)[0]);
      });

      resp.on("error", (err) => {
        reject("Error: " + err.message);
      });
    });
  });
}

async function manageChampionJSON() {
  let currentChampJS = readMyChampionJS();
  let remVer = await remoteVersion();
  console.log('remote version', remVer);
  if(remVer == currentChampJS.version)
    return false;

  rewriteChampJSON(remVer);
  return true;
}


module.exports.manageChampionJSON = manageChampionJSON;