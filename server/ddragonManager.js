const https = require('https');
const fs = require('fs');

const champPath = './public/ddragonData/img/champion/';
const profilePath = './public/ddragonData/img/profileicon/';


/**
 * downloads champion icon according to given champion name if necessary
 * @champName name of the champion
 */
function manageChampionIcon(champName) {
  let path = champPath + champName +".png"
  if( !fs.existsSync(path) ) {
    var ddragonURL = "https://ddragon.leagueoflegends.com/cdn/"+ process.env.RIOT_VERSION+"/img/";
    return downloadIcon(path, ddragonURL + "champion/"+champName+".png");
  }

  return Promise.resolve();  
}

/**
 * downloads profile icon from given id
 * @iconId id of the profile icon
 */
function manageProfileIcon(iconId) {
  let path = profilePath + iconId +".png"
  if( !fs.existsSync(path) ) {
    var ddragonURL = "https://ddragon.leagueoflegends.com/cdn/"+ process.env.RIOT_VERSION+"/img/";
    return downloadIcon(path, ddragonURL + "profileicon/"+iconId+".png");
  }

  return Promise.resolve();
}


function downloadIcon(path, url) {
  console.log("downloading new Icon to: ", path);
  var file = fs.createWriteStream(path);
  return new Promise((resolve, reject) => https.get(url,
    response => {
      response.pipe(file).on('finish', resolve)
        .on('error', reject);
    }
  ));
}


module.exports.manageProfileIcon = manageProfileIcon;
module.exports.manageChampionIcon = manageChampionIcon;