const helper = require("./helpers");

async function processMessage(message) {
    console.log(message);
    await helper.connectMongo();

    //Actualizar db
    

    console.log("Request finalizado")
}

module.exports = {
    processMessage
}