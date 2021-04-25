'use strict';

const AWS = require('aws-sdk');
const attr = require('dynamodb-data-types').AttributeValue;

AWS.config.update({
 "region": "eu-west-3",
 "accessKeyId": process.env.AKI,
 "secretAccessKey": process.env.SAK
});

let dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

const players_table = process.env.table_name || "players_S11_dev";
const histories_table = process.env.histories_table || "Histories_S11_dev";
const archived_histories_table = process.env.archived_histories_table || "Archived_Histories_S11_dev";

const beginning_of_season = process.env.beginning_of_season || 1610076600000; //2021/01/08 - 04:30:00

//Size of history to be stored in histories_table
const maxHistorySize = 20;

function getSumBySummonerId(id) {
  var params = {
    Key: {
     "id": {
       S: id
      }
    }, 
    TableName: players_table,
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

/*
 *  Retrieves the list of matches corresponding to the given summoner's id
 *  from the Histoies table.
 *  Returns a promise resolving in a list object
 */
function getSumHistory(id) {
  var params = {
    Key: {
      "id": {
        S: id
      }
    },
    TableName: histories_table,
    ConsistentRead: true,
  };

  return new Promise((resolve, reject) => {
    dynamodb.getItem(params, function(err, data) {
      if (err) reject(err);
      else {
        if(Object.keys(data).length != 0)
          resolve(attr.unwrap(data.Item).history);
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
    summoner.lastGameTime = +beginning_of_season;

    let dynamoItem = attr.wrap(summoner);

    dynamoItem.rank = {"M": attr.wrap({
      "league": 0,
      "div": 0,
      "lp": 0,
      "bo": "ooo"
    })};

    var params = {
      Item: dynamoItem, 
      TableName: players_table
     };
    dynamodb.putItem(params, function(err, data) {
       if (err) console.log(err, err.stack); // an error occurred
       else     console.log(data);           // successful response
    });

    //New row in players created. Now creating a new row in histories table

    let historyObject = {
      id: summoner.id
    }

    dynamoItem = attr.wrap(historyObject);
    dynamoItem.history = {"L": []}; //attr.wrap is bugged

    params = {
      Item: dynamoItem,
      TableName: histories_table
    };

    dynamodb.putItem(params, function(err, data) {
       if (err) console.log(err, err.stack); // an error occurred
       else     console.log(data);           // successful response
    });

    //New row in histories created. Now creating a new row in archived histories table
    params.TableName = archived_histories_table;

    dynamodb.putItem(params, function(err, data) {
       if (err) console.log(err, err.stack); // an error occurred
       else     console.log(data);           // successful response
    });

}

/**
 * Updates the name and profileIcon of the given sum.
 */
function updateNameAndIcon(sum) {
  let di = attr.wrap(sum);

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
    TableName: players_table, 
    UpdateExpression: "SET #N = :n, #P = :p"
  };

  
  dynamodb.updateItem(params, function(err, data) {
    if (err) console.error(err); // an error occurred - array
    else     console.log("updated data of", sum.name); // successful response
  });
}


/**
 * Called when new games are being pushed. Uptades the given summoner 
 * in the players database.
 * 
 * returns a promise resolving into console logs or rejects as an error
 */
function fullyUpdatePlayerRow(sum) {
  //if there are new games, push them
  sum.lastGameTime = sum.history[sum.history.length-1].timestamp;

  let di = attr.wrap(sum);

  let params = {
    ExpressionAttributeNames: {
     "#R": "rank",
     "#N": "name",
     "#M": "mainChampId",
     "#W": "wins",
     "#L": "loss",
     "#P": "profileIconId",
     "#T": "lastGameTime",
    }, 
    ExpressionAttributeValues: {
     ":r": di.rank,
     ":n": di.name,
     ":m": di.mainChampId,
     ":w": di.wins,
     ":l": di.loss,
     ":p": di.profileIconId,
     ":t": di.lastGameTime,
    }, 
    Key: {
     "id": {
       S: sum.id
      }
    }, 
    TableName: players_table, 
    UpdateExpression: "SET #R = :r, #N = :n, #M = :m, #W = :w, #L = :l, #P = :p, #T = :t"
  };

  let promises = [];

  return new Promise( (resolve, reject) => {
    dynamodb.updateItem(params, function(err, data) {
      if (err) reject(err); // an error occurred
      else     resolve(console.log("updated data of", sum.name)); // successful response
    });
  });

}

/**
 * limit history size in history table by erasing games older than the 20 first ones
 * takes the summoner's stats (sum) and the previous size of the history
 */
function limitHistorySize(sum, oldHistorySize) {

  let spotsLeft = maxHistorySize - oldHistorySize;
  spotsLeft = spotsLeft < 0 ? 0 : spotsLeft;
  let totalGames2remove = sum.history.length - spotsLeft;

  if(totalGames2remove <= 0) {
    return;
  }

  //Expression size's limit exceeded when trying to remove more than 19 items at once
  let mostElementsRemovedAtOnce = 19;

  while(totalGames2remove > 0) {

    //build a remove expression conaining the right number of games for this call
    let games2remove = totalGames2remove > 19 ? 19 : totalGames2remove;
    let removeExpression = "REMOVE history[0]";
    for(let i = 1 ; i < games2remove ; i++) {
      removeExpression += `, history[${i}]`;
    }

    totalGames2remove -= mostElementsRemovedAtOnce;

    let params = {
      Key: {
       "id": {
         S: sum.id
        }
      }, 
      TableName: histories_table, 
      UpdateExpression: removeExpression,
    };

    dynamodb.updateItem(params, function(err, data) {
      if(err) console.error(err);
      else console.log(data);
    });
  }
}

/**
 * Uptades the given summoner in the players database. uses the oldHistorySize to keep
 * the history table field from going beyond 20 games
 * If there are new games to store, these are pushed into both histories tables
 * returns a promise resolving into console logs or rejects as an array of errors
 */
function updateSum(sum, oldHistorySize) {
  if(sum.history.length == 0) {
    //only push the name and profileIcon  
    updateNameAndIcon(sum);
    return new Promise((res, rej) => resolve());
  }

  let promises = [];

  //if there are new games, push them
  sum.lastGameTime = sum.history[sum.history.length-1].timestamp;

  promises.push(fullyUpdatePlayerRow(sum));

  let di = attr.wrap(sum);

  let recentHistory = getRecentHistory(di.history);

  let params = {
    ExpressionAttributeNames: {
     "#H": "history", 
    }, 
    ExpressionAttributeValues: {
     ":h": recentHistory,
    }, 
    Key: {
     "id": {
       S: sum.id
      }
    }, 
    TableName: histories_table, 
    UpdateExpression: "SET #H = list_append(#H,:h)"
  };

  promises.push(new Promise( (resolve, reject) => {
    dynamodb.updateItem(params, function(err, data) {
      if (err) reject(err); // an error occurred
      else {
        //only keep 20 more recent games in history table
        limitHistorySize(sum, oldHistorySize);
        resolve(console.log("updated history of", sum.name)); // successful response  
      }
    });
  }));

  //Same thing for archived histories table
  params.TableName = archived_histories_table;

  promises.push(new Promise( (resolve, reject) => {
    dynamodb.updateItem(params, function(err, data) {
      if (err) reject(err); // an error occurred
      else     resolve(console.log("updated archived history of", sum.name)); // successful response
    });
  }));

  return Promise.all(promises);
}

/**
 *  @param dynamodbHistory an history of games in dynamoDB list format
 *  @returns the same history but only <maxHistorySize> most recent games
 *    whithout modifying the input array
 */
function getRecentHistory(dynamodbHistory) {
  const historyLength = dynamodbHistory.L.length;

  if(historyLength > maxHistorySize) {
    return {L : dynamodbHistory.L.slice(historyLength-20, historyLength)};
  } else {
    return dynamodbHistory;
  }
}

async function getAllUsers() {
  let res = [];
  await recScan(res, null).catch(err => console.error(err, err.stack));
  return res;
}

function recScan(prevData, lastEvaluatedKey) {
  var params = { 
    TableName: players_table,
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
module.exports.getSumHistory = getSumHistory;
module.exports.putNewSummoner = putNewSummoner;
module.exports.getSumBySummonerId = getSumBySummonerId;
module.exports.updateSum = updateSum;
