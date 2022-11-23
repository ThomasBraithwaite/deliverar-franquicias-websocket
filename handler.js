const helper = require("./helpers");
const fs = require('fs')
const OrderProviderHistoryModel = require("./models/order_provider_history.model");
const OrderClientHistoryModel = require("./models/order_client_history.model");
const { ProveedorModel } = require("./models/proveedor.model");
const { ProductModel } = require("./models/product.model");

async function processMessage(message) {
    console.log(message.contenido)
    console.log(message.emisor)

    fs.appendFile('websocket.log', `${new Date().toLocaleString("es-AR", {timeZone: "America/Argentina/Buenos_Aires"})}\nEmisor: ${message.emisor}\nContenido:\n${message.contenido}\n#######################\n`, function (err) {
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
        fs.appendFile('websocket-error.log', `${new Date().toLocaleString("es-AR", {timeZone: "America/Argentina/Buenos_Aires"})}\nEmisor: ${message.emisor}\nContenido:\n${message.contenido}\nError:\n${error}\n#######################\n`, function (err) {
            if (err) return console.log(err);
            console.log('Log Saved!!');
        });
    }

    console.log("Request finalizado")
}

async function procesarProveedor(message) {
    await helper.connectMongo()
    if(message?.tipo === "nuevo-pedido") {
        const idPedidoResponse = await OrderProviderHistoryModel.findByIdAndUpdate(message._id, { idPedido: message.idPedido })
        console.log(idPedidoResponse)
    }
    else if(message?.tipo === "actualizacion-pedido") {
        await OrderProviderHistoryModel.findOneAndUpdate({idPedido: message.idPedido}, { estado_orden: "FINALIZADO" })

        const orderSent = await OrderProviderHistoryModel.findOne({ 
            idPedido: message.idPedido
        });
        await Promise.all(orderSent.productos.map(async (product) => {
            await ProductModel.findOneAndUpdate({codigo_producto: product.codigo_producto},
                {
                    ...product,
                    cantidad: { $inc: product.cantidad }
                },
                {
                    upsert: true
                }
            );
        }))
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
    if(message.tipo === "orden") {
        await OrderClientHistoryModel.insertMany([{
            estado_orden: "PENDIENTE",
            comidas: message.meals.map(x => {
                const { quantity, ...meal } = x
                return {
                    comida: meal,
                    cantidad: quantity
                }
            }),
            direccion_destino : message.client_address,
            order_id: message.order_id
        }])
    }
}

module.exports = {
    processMessage
}