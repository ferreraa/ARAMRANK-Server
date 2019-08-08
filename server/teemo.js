/*const {DDragon, Pyke} = require('pyke');

const pyke = new Pyke('RGAPI-d7f09129-6464-4a1f-b3bd-371be842b491', "10");
	
function searchSummoner (name) {
	pyke.summoner.getBySummonerName(name, "euw1").then(data => {
  console.log(`Summoner Name is : ${data.name}, and level is : ${data.summonerLevel}`);
}).catch(console.error);
}*/

const TeemoJS = require('teemojs');
let api = TeemoJS('RGAPI-f84d6850-435f-435a-b2a8-fdbc6112624e');

function searchSummoner(name) {
	let data = api.get('euw1', 'summoner.getBySummonerName', name);
	return data;
}

async function getSumMain(id) {
	let data = await api.get('euw1', 'championMastery.getAllChampionMasteries', id);
	return data[0].championId;
}
// Get C9 Sneaky's games on Ezreal and Kalista for a particular season.
//api.get('na1', 'match.getMatchlist', 78247, { champion: [81, 429], season: 8 })
//  .then(...);


module.exports.searchSummoner = searchSummoner;
module.exports.getSumMain = getSumMain;