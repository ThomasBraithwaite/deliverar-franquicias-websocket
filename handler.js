const helper = require("./helpers");
const fs = require('fs')
let datetime = new Date();

async function processMessage(message) {
    console.log(message.contenido)
    console.log(message.emisor)

    fs.appendFile('websocket.log', datetime + '\n' + 'Emisor: ' + message.emisor + '\nContenido:\n' + message.contenido + '\n#######################\n', function (err) {
        if (err) return console.log(err);
        console.log('Log Saved!!');
     });
     
     //Actualizar db
     // await helper.connectMongo()
    

    console.log("Request finalizado")
}

module.exports = {
    processMessage
}