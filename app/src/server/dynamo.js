'use strict';

const AWS = require('aws-sdk');
const attr = require('dynamodb-data-types').AttributeValue;

AWS.config.update({
 "region": "eu-west-3",
 "credentials": {
   "accessKeyId": process.env.AKI,
   "secretAccessKey": process.env.SAK
 }
});

const dynamodbConfig = {
  apiVersion: '2012-08-10',
};

if (process.env.NODE_ENV !== 'production') {
  dynamodbConfig.endpoint = 'http://dynamodb-local:8000';
}

const dynamodb = new AWS.DynamoDB(dynamodbConfig);


const players_table = process.env.table_name || "players_S14.5_dev";

const BEGINNING_OF_SEASON = process.env.beginning_of_season || 1715767200; //2024/05/15 - 12:00:00 GMT

//Size of history to be stored in histories_table
const maxHistorySize = 20;

function getSumBySummonerPUUID(puuid) {
  var params = {
    Key: {
     "puuid": {
       S: puuid,
      },
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

function putNewSummoner(summoner) {
  return new Promise(async (resolve, reject) => {
    summoner.date0 = Date.now();
    summoner.wins = 0;
    summoner.losses = 0;
    summoner.lastGameId = '';
    summoner.rank = {
      league: 0,
      div: 0,
      lp: 0,
      bo: 'ooo',
    };

    let dynamoItem = attr.wrap(summoner);
    dynamoItem.history = {"L": []}; //attr.wrap can't know if it's a list or a set

    let params = {
      Item: dynamoItem,
      TableName: players_table,
    };

    let unwrappedDBSummoner = attr.unwrap(dynamoItem);

    dynamodb.putItem(params, function(err, data) {
       if (err) reject(err);
       resolve(unwrappedDBSummoner);
    });
  });
}

function removePlayer(puuid) {
  const params = {
    Key: {
      puuid: {
        S: puuid,
      },
    },
    TableName: players_table,
  };

  dynamodb.deleteItem(params, (err, data) => {
    if (err) console.warn('error when trying to remove player ', err);
    console.log(`summoner ${puuid} successfully removed`);
  });
}

/**
 * Updates the name and profileIcon of the given sum.
 */
function updateNameAndIcon(sum) {
  const di = attr.wrap(sum);

  const params = {
    ExpressionAttributeNames: {
     "#N": "name",
     "#P": "profileIconId"
    }, 
    ExpressionAttributeValues: {
     ":n": di.name,
     ":p": di.profileIconId
    }, 
    Key: {
     "puuid": {
       S: sum.puuid
      }
    }, 
    TableName: players_table, 
    UpdateExpression: "SET #N = :n, #P = :p"
  };


  dynamodb.updateItem(params, function(err, data) {
    if (err) console.error(err); // an error occurred - array
    else     console.log("updated name or icon of", sum.name); // successful response
  });
}


/**
 * Called when new games are being pushed. Uptades the given summoner 
 * in the players database.
 * 
 * sum.history must be defined and contain the maxHistorySize last games
 * 
 * returns a promise resolving into console logs or rejects as an error
 */
function fullyUpdatePlayerRow(sum) {
  if (undefined === sum?.history?.length || sum.history.length === 0) {
    console.warn('fullyUpdatePlayerRow should only be called when a user has new games to store');
    return Promise.resolve();
  }

  //if there are new games, push them
  sum.lastGameId = sum.history[sum.history.length-1].gameId;

  const di = attr.wrap(sum);

  const params = {
    ExpressionAttributeNames: {
     "#R": "rank",
     "#N": "name",
     "#M": "mainChampId",
     "#W": "wins",
     "#L": "losses",
     "#P": "profileIconId",
     "#I": "lastGameId",
     "#H": 'history',
    },
    ExpressionAttributeValues: {
     ":r": di.rank,
     ":n": di.name,
     ":m": di.mainChampId,
     ":w": di.wins,
     ":l": di.losses,
     ":p": di.profileIconId,
     ":i": di.lastGameId,
     ":h": di.history,
    },
    Key: {
     "puuid": {
       S: sum.puuid
      }
    },
    TableName: players_table,
    UpdateExpression: "SET #R = :r, #N = :n, #M = :m, #W = :w, #L = :l, #P = :p, #I = :i, #H = :h",
  };

  return new Promise((resolve, reject) => {
    dynamodb.updateItem(params, function(err, data) {
      if (err) reject(err); // an error occurred
      else     resolve(console.log("updated player row of", sum.name)); // successful response
    });
  });
}

/**
 * Uptades the given summoner in the players database. uses the oldHistorySize to keep
 * the history table field from going beyond 20 games
 * If there are new games to store, these are pushed into both histories tables
 * returns a promise resolving into console logs or rejects as an array of errors
 */
function updateSum(sum, lastGameId) {
  if (
    sum.history.length === 0
    || lastGameId === sum.history[sum.history.length - 1].gameId
  ) {
    //only push the name and profileIcon  
    updateNameAndIcon(sum);
    return Promise.resolve();
  }

  return fullyUpdatePlayerRow(sum);
}

async function getAllUsers(ladderValuesOnly = true) {
  const res = [];
  await recScan(res, null, ladderValuesOnly).catch(console.error);
  return res;
}

function recScan(prevData, lastEvaluatedKey, ladderValuesOnly) {
  var params = { 
    TableName: players_table,
    ConsistentRead: true,
  };

  if (ladderValuesOnly) {
    params.ExpressionAttributeNames = { 
      '#r': 'rank',
      '#n': 'name',
    };
    params.ProjectionExpression = '#r, #n, profileIconId, wins, losses';
  }

  if(lastEvaluatedKey !== null)  //This is not the first scan
    params.ExclusiveStartKey = lastEvaluatedKey;

  return new Promise((resolve, reject) => {
    dynamodb.scan(params, async function(err, data) {
      if (err) reject(err);
      else {
        if (data.LastEvaluatedKey !== undefined) { //more items to scan
          await recScan(prevData, data.LastEvaluatedKey).catch(err => reject(err));
        }
        resolve(
          data.Items.forEach(e => {
            prevData.push(attr.unwrap(e));
          })
        ); 
      }        
    });
  });
}

module.exports.getAllUsers = getAllUsers;
module.exports.putNewSummoner = putNewSummoner;
module.exports.removePlayer = removePlayer;
module.exports.getSumBySummonerPUUID = getSumBySummonerPUUID;
module.exports.updateSum = updateSum;
module.exports.BEGINNING_OF_SEASON = BEGINNING_OF_SEASON;
module.exports.maxHistorySize = maxHistorySize;