const helper = require("./helpers");
const fs = require('fs')
let datetime = new Date();

async function processMessage(message) {
    console.log(message)
    console.log(message.contenido)
    console.log(message.emisor)

    fs.appendFile('websocket.log', datetime + '\n' + 'Emisor: ' + message.emisor + '\nContenido:\n' + message.contenido + '\n#######################\n', function (err) {
        if (err) return console.log(err);
        console.log('Appended!');
     });
    await helper.connectMongo()

    //Actualizar db
    

    console.log("Request finalizado")
}

module.exports = {
    processMessage
}