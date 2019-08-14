let AWS = require('aws-sdk');

AWS.config.update({
 "region": "eu-west-3",
 "accessKeyId": "AKIAWVUBBVS4GUPVW64P",
 "secretAccessKey": "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"
});

let dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

const table_name = "players_test2";

function getSumByAccountId(accountId) {
	var params = {
	  Key: {
	   "accountID": { //Warning!!! TODO use id for summoner ID since accountID is not relyable
	     S: accountId
	    }
	  }, 
	  TableName: "players_test"
	};


	return new Promise((resolve, reject) => {
		dynamodb.getItem(params, function(err, data) {
		   if (err) console.log(err, err.stack); // an error occurred
		   else     resolve(data);           // successful response
		});
	});


}

function putNewSummoner(summoner) {

    let date = new Date();
    let table = "players_test";
      var params = {
        Item: {
         "accountID": {
            S: summoner.accountId
          }, 
         "name": {
            S: summoner.name
          }, 
         "sumID": {
            S: summoner.id
          },
          "puuid": {
            S: summoner.puuid
          },
          "wins": {
            N: "0"
          },
          "loss": {
            N: "0"
          },
          "date0": {
            S: date.getTime().toString()
          },
          "rank": {
            M: {
              "league": { N: "0" },
              "div": { N: "0" },
              "lp": { N: "0" },
              "bo": { S: "ooo" }
            }
          },
          "history": {
            L: []
          },
          "main": {
          	N: summoner.mainChampId.toString()
          } 
        }, 
        ReturnConsumedCapacity: "TOTAL", 
        TableName: table
       };
      dynamodb.putItem(params, function(err, data) {
         if (err) console.log(err, err.stack); // an error occurred
         else     console.log(data);           // successful response
      });
}


function preprocessData(sum) {
  let rank = sum.rank;
  rank.league.N = rank.league.N.toString();
  rank.lp.N = rank.lp.N.toString();
  rank.div.N = rank.div.N.toString();
}

function updateSum(sum) {

  var params = {
    ExpressionAttributeNames: {
     "#H": "history", 
     "#R": "rank",
     "#N": "name",
     "#M": "main",
    }, 
    ExpressionAttributeValues: {
     ":h": {
       L: sum.history
      }, 
     ":r": {
       M: sum.rank
      },
      ":n": {
        S: sum.name
      },
      ":main" : {
        N: sum.id
      },

    }, 
    Key: {
     "accountID": {
       S: sum.accountID
      }
    }, 
    ReturnValues: "ALL_NEW", 
    TableName: "players_test", 
    UpdateExpression: "SET #H = :h, #R = :r, #N = :n, #M = :m"
 };
 dynamodb.updateItem(params, function(err, data) {
   if (err) console.log(err, err.stack); // an error occurred
   else     console.log(data);           // successful response

 });
}

module.exports.putNewSummoner = putNewSummoner;
module.exports.getSumByAccountId = getSumByAccountId;
module.exports.updateSum = updateSum;