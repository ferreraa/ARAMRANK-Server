

function processGameResult(sum, match) {
  let win = match.win;
  //TODO
}

function getLastTimeStamp(dbSum) {
	var timestamp = dbSum.Item.date0.S;
	let length = dbSum.Item.history.L.length;
	

	if(length > 0)
		timestamp = dbSum.Item.history.L[length-1].timestamp.N;

	return timestamp;
}

module.exports.getLastTimeStamp = getLastTimeStamp;