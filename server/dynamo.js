'use strict';

const AWS = require('aws-sdk');
const attr = require('dynamodb-data-types').AttributeValue;

AWS.config.update({
 "region": "eu-west-3",
 "accessKeyId": process.env.AKI,
 "secretAccessKey": process.env.SAK
});

let dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

const table_name = process.env.table_name || "players_S10_dev";


function getSumBySummonerId(id) {
  var params = {
    Key: {
     "id": {
       S: id
      }
    }, 
    TableName: table_name,
    ConsistentRead: true,
  };


  return new Promise((resolve, reject) => {
    dynamodb.getItem(params, function(err, data) {
       if (err) reject(err); // an error occurred
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


    let dynamoItem = attr.wrap(summoner);

    dynamoItem.rank = {"M": attr.wrap({
      "league": 0,
      "div": 0,
      "lp": 0,
      "bo": "ooo"
    })};
    dynamoItem.history = {"L": []}; //lib is bugged

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

  //at least push the name
  var params = {
    ExpressionAttributeNames: {
     "#N": "name",
     "#P": "profileIconId"
    }, 
    ExpressionAttributeValues: {
     ":n": di.name,
     ":p": di.profileIconId
    }, 
    Key: {
     "id": {
       S: sum.id
      }
    }, 
    ReturnValues: "ALL_NEW", 
    TableName: table_name, 
    UpdateExpression: "SET #N = :n, #P = :p"
  };

  //if there are new games, push them
  if(sum.history.length>0) {
    params = {
      ExpressionAttributeNames: {
       "#H": "history", 
       "#R": "rank",
       "#N": "name",
       "#M": "mainChampId",
       "#W": "wins",
       "#L": "loss",
       "#P": "profileIconId"
      }, 
      ExpressionAttributeValues: {
       ":h": di.history, 
       ":r": di.rank,
       ":n": di.name,
       ":m": di.mainChampId,
       ":w": di.wins,
       ":l": di.loss,
       ":p": di.profileIconId
      }, 
      Key: {
       "id": {
         S: sum.id
        }
      }, 
      ReturnValues: "ALL_NEW", 
      TableName: table_name, 
      UpdateExpression: "SET #H = list_append(#H,:h), #R = :r, #N = :n, #M = :m, #W = :w, #L = :l, #P = :p"
    };
  }

 return new Promise( (resolve, reject) => {
   dynamodb.updateItem(params, function(err, data) {
     if (err) reject(err); // an error occurred
     else     resolve(console.log("updated data of", sum.name));           // successful response
   });
 });
}


async function getAllUsers() {
  let res = [];
  await recScan(res, null).catch(err => console.error(err, err.stack));
  return res;
}

function recScan(prevData, lastEvaluatedKey) {
  var params = { 
    TableName: table_name,
    ConsistentRead: true,
  };

  if(lastEvaluatedKey != null)  //This is not the first scan
    params.ExclusiveStartKey = lastEvaluatedKey;

  return new Promise((resolve, reject) => {
    dynamodb.scan(params, async function(err, data) {
      if (err) reject(err); // an error occurred
      else {   // successful response
        if(typeof data.LastEvaluatedKey != "undefined") { //more items to scan
          await recScan(prevData, data.LastEvaluatedKey).catch(err => reject(err));
        }
        resolve(
          data.Items.forEach(function(e) {
            prevData.push(attr.unwrap(e));
          })
        ); 
      }          
    });
  });
}




module.exports.getAllUsers = getAllUsers;
module.exports.putNewSummoner = putNewSummoner;
module.exports.getSumBySummonerId = getSumBySummonerId;
module.exports.updateSum = updateSum;
