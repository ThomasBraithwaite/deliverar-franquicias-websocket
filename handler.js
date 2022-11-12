const helper = require("./helpers");

async function processMessage(message) {
    console.log(message)
    console.log(message.contenido)
    console.log(message.emisor)
    await helper.connectMongo()

    //Actualizar db
    

    console.log("Request finalizado")
}

module.exports = {
    processMessage
}