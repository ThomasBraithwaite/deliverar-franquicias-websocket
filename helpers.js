const aws = require('aws-sdk');
const mongoose = require("mongoose");
const bluebird = require("bluebird");

//Local env var
const isLocal = process.env.IS_LOCAL

// mongo secret
async function getMongoSecret() {
    const dbConnectionEnvVarName = 'DB_CONNECTION_SECRET'
    const parameterName = `/amplify/d38mvh2aq7ita4/prod/AMPLIFY_deliverarFranquiciasLambda_${dbConnectionEnvVarName}` 
  
    return await getParameter(parameterName)
}
  
async function getParameter(parameterName) {
    const config = {
        region: 'us-east-1'
    }

    const ssm = new aws.SSM(config)

    return ssm
        .getParameter({
            Name: parameterName,
            WithDecryption: true,
        })
        .promise()
}

// Connection to MongoDB
async function connectMongo(){
    const response = await getMongoSecret()
    const secret = getMongoUrl(response)

    mongoose.Promise = bluebird;
    const url = secret;
    const opts = {
        connectTimeoutMS: 20000,
    };
    
    try {
        await mongoose.connect(url, opts)
        console.info('Successfully connected to Mongodb...')
    }
    catch(e) {
        console.error(`Error Connecting to Mongodb...`)
        console.error(e);
    }
}

function getMongoUrl(response) {
    const [url_1, url_2] = response.Parameter?.Value.split("?");
  
    return isLocal ? url_1+"?"+url_2 : url_1+"franquicia_db?"+url_2;
}

module.exports = {
    connectMongo,
}