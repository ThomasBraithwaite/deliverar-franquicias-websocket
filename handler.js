const helper = require("./helpers");
const fs = require('fs')
let datetime = new Date();
const OrderProviderHistoryModel = require("./models/order_provider_history.model");
const OrderClientHistoryModel = require("./models/order_client_history.model");
const { ProveedorModel } = require("./models/proveedor.model");

async function processMessage(message) {
    console.log(message.contenido)
    console.log(message.emisor)

    fs.appendFile('websocket-error.log', `${datetime}\nEmisor: ${message.emisor}\nContenido:\n${message.contenido}\n#######################\n`, function (err) {
        if (err) return console.log(err);
        console.log('Log Saved!!');
    });
    
    try {

        if(mensaje.emisor === "proveedor") {
            await procesarProveedor(mensaje.contenido)
        }
        else if(mensaje.emisor === "cliente") {
            await procesarCliente(mensaje.contenido)
        }
    }
    catch(error) {
        fs.appendFile('websocket-error.log', `${datetime}\nEmisor: ${message.emisor}\nContenido:\n${message.contenido}\nError:\n${error}\n#######################\n`, function (err) {
            if (err) return console.log(err);
            console.log('Log Saved!!');
        });
    }

    console.log("Request finalizado")
}

async function procesarProveedor(mensaje) {
    await helper.connectMongo()
    if(mensaje?.tipo === "nuevo-pedido") {
        await OrderProviderHistoryModel.findByIdAndUpdate(mensaje._id, { idPedido: mensaje.idPedido })
    }
    else if(mensaje?.tipo === "actualizacion-pedido") {
        await OrderProviderHistoryModel.findOneAndUpdate({idPedido: mensaje.idPedido}, { estado_orden: "FINALIZADO" })
    }
    else {
        await ProveedorModel.deleteMany({})
        await ProveedorModel.collection.insertMany(mensaje.filter(x => x.CodProducto).map(x => {
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

async function procesarCliente(mensaje) {
    await helper.connectMongo()
    if(mensaje.tipo === "nuevo-pedido") {
        await OrderClientHistoryModel.insertMany([{
            estado_orden: "PENDIENTE",
            comidas: mensaje.comidas,
            direccion_destino : mensaje.direccion_destino
        }])
    }
}

module.exports = {
    processMessage
}