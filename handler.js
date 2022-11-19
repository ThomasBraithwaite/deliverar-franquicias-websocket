const helper = require("./helpers");
const fs = require('fs')
const OrderProviderHistoryModel = require("./models/order_provider_history.model");
const OrderClientHistoryModel = require("./models/order_client_history.model");
const { ProveedorModel } = require("./models/proveedor.model");

async function processMessage(message) {
    console.log(message.contenido)
    console.log(message.emisor)

    fs.appendFile('websocket.log', `${new Date()}\nEmisor: ${message.emisor}\nContenido:\n${message.contenido}\n#######################\n`, function (err) {
        if (err) return console.log(err);
        console.log('Log Saved!!');
    });
    
    try {

        if(message.emisor === "proveedor") {
            await procesarProveedor(JSON.parse(message.contenido))
        }
        else if(message.emisor === "cliente") {
            await procesarCliente(JSON.parse(message.contenido))
        }
    }
    catch(error) {
        fs.appendFile('websocket-error.log', `${new Date()}\nEmisor: ${message.emisor}\nContenido:\n${message.contenido}\nError:\n${error}\n#######################\n`, function (err) {
            if (err) return console.log(err);
            console.log('Log Saved!!');
        });
    }

    console.log("Request finalizado")
}

async function procesarProveedor(message) {
    await helper.connectMongo()
    if(message?.tipo === "nuevo-pedido") {
        await OrderProviderHistoryModel.findByIdAndUpdate(message._id, { idPedido: message.idPedido })
    }
    else if(message?.tipo === "actualizacion-pedido") {
        await OrderProviderHistoryModel.findOneAndUpdate({idPedido: message.idPedido}, { estado_orden: "FINALIZADO" })
    }
    else {
        await ProveedorModel.deleteMany({})
        await ProveedorModel.collection.insertMany(message.filter(x => x.CodProducto).map(x => {
            return {
                Descripcion: x.Descripcion,
                codigo_producto: x.CodProducto,
                cantidad: x.Stock,
                precio: x.precio,
                porcentaje: x.porcentaje,
                fecha_vigencia: x.FechaVigencia,
                estado_oferta: x.EstadoOferta,
                fecha_alta: x.FecAlta,
                id_proveedor: x.IdProveedor
            }
        }));
    }
}

async function procesarCliente(message) {
    await helper.connectMongo()
    if(message.tipo === "nuevo-pedido") {
        await OrderClientHistoryModel.insertMany([{
            estado_orden: "PENDIENTE",
            comidas: message.comidas,
            direccion_destino : message.direccion_destino
        }])
    }
}

module.exports = {
    processMessage
}