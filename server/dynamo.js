let AWS = require('aws-sdk');

AWS.config.update({
 "region": "eu-west-3",
 "accessKeyId": "AKIAWVUBBVS4GUPVW64P",
 "secretAccessKey": "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"
});

let dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});



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


module.exports.putNewSummoner = putNewSummoner;