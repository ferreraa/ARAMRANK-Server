'use strict';

const AWS = require('aws-sdk');

AWS.config.update({ region: "localhost", endpoint: process.env.db_host, accessKeyId: 'dev', secretAccessKey: 'dev' });

const dynamodb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

async function listTables() {
    new Promise((res, rej) => {
        dynamodb.listTables({Limit: 3}, (err, data) => {
            if (err) {
                console.log("Error", err.code);
                return rej(err);
            }
            return res(data.TableNames);
        });
    });
}

async function initDevDb() {
    const promise = new Promise (() => { listTables() });

    promise.then((tableList) => {
        initPlayerTable(tableList);
        initHistoriesTable(tableList);
        initArchivedHistoriesTable(tableList);
    });
}

function handleTableCreation(err, data) {
    if (err)
        console.log("Error", err);
    else
        console.log("Table Created", data);
}

async function initPlayerTable(tableList) {
    if (!tableList.includes(process.env.table_name)) {
        let params = {
            TableName: process.env.table_name,
            AttributeDefinitions: [
                { AttributeName: "id",          AttributeType: 'S' },
                { AttributeName: "accountId",   AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'id',          KeyType: 'HASH' },
                { AttributeName: 'accountId',   KeyType: 'RANGE' }
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
        }

        dynamodb.createTable(params, handleTableCreation)
    }
}

async function initHistoriesTable(tableList) {
    if(!tableList.includes(process.env.histories_table)) {
        let params = {
            TableName: process.env.histories_table,
            AttributeDefinitions: [
                { AttributeName: 'id',      AttributeType: 'S' },
                { AttributeName: 'history', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'id',      KeyType: 'HASH' },
                { AttributeName: 'history', KeyType: 'RANGE' }
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
        }

        dynamodb.createTable(params, handleTableCreation)
    }
}

async function initArchivedHistoriesTable(tableList) {
    if(!tableList.includes(process.env.archived_histories_table)) {
        let params = {
            TableName: process.env.archived_histories_table,
            AttributeDefinitions: [
                { AttributeName: 'id',      AttributeType: 'S' },
                { AttributeName: 'history', AttributeType: 'S' }
            ],
            KeySchema: [
                { AttributeName: 'id',      KeyType: 'HASH' },
                { AttributeName: 'history', KeyType: 'RANGE' }
            ],
            ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 }
        }
        dynamodb.createTable(params, handleTableCreation)
    }
}

module.exports.initDevDb = initDevDb;