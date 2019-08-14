const AWS = require('aws-sdk');
const attr = require('dynamodb-data-types').AttributeValue;

AWS.config.update({
 "region": "eu-west-3",
 "accessKeyId": "AKIAWVUBBVS4GUPVW64P",
 "secretAccessKey": "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"
});

let dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

const table_name = "players_test2";

function getSumByAccountId(id) {
	var params = {
	  Key: {
	   "id": { //Warning!!! TODO use id for summoner ID since accountID is not relyable
	     S: id
	    }
	  }, 
	  TableName: table_name
	};


	return new Promise((resolve, reject) => {
		dynamodb.getItem(params, function(err, data) {
		   if (err) console.log(err, err.stack); // an error occurred
		   else {
        if(Object.keys(data).length != 0)
          resolve(attr.unwrap(data.Item));           // successful response
        else
          resolve(null);
        } 
		});
	});


}

function putNewSummoner(summoner) {

    summoner.date0 = Date.now();

    summoner.wins = 0;
    summoner.loss = 0;


    dynamoItem = attr.wrap(summoner);

    dynamoItem.rank = {"M": attr.wrap({
      "league": 0,
      "div": 0,
      "lp": 0,
      "bo": "ooo"
    })};
    dynamoItem.history = {"L": []}; //lib is bugged

    console.log(dynamoItem);

    var params = {
      Item: dynamoItem, 
      ReturnConsumedCapacity: "TOTAL", 
      TableName: table_name
     };
    dynamodb.putItem(params, function(err, data) {
       if (err) console.log(err, err.stack); // an error occurred
       else     console.log(data);           // successful response
    });
}



function updateSum(sum) {
  let di = attr.wrap(sum);

  var params = {
    ExpressionAttributeNames: {
     "#H": "history", 
     "#R": "rank",
     "#N": "name",
     "#M": "main",
     "#W": "wins",
     "#L": "loss",
    }, 
    ExpressionAttributeValues: {
     ":h": di.history, 
     ":r": di.rank,
     ":n": di.name,
     ":m": di.id,
     ":w": di.wins,
     ":l": di.loss
    }, 
    Key: {
     "id": {
       S: sum.id
      }
    }, 
    ReturnValues: "ALL_NEW", 
    TableName: table_name, 
    UpdateExpression: "SET #H = list_append(#H,:h), #R = :r, #N = :n, #M = :m, #W = :w, #L = :l"
 };
 dynamodb.updateItem(params, function(err, data) {
   if (err) console.log(err, err.stack); // an error occurred
   else     console.log("updated data of", sum.name);           // successful response

 });
}

module.exports.putNewSummoner = putNewSummoner;
module.exports.getSumByAccountId = getSumByAccountId;
module.exports.updateSum = updateSum;