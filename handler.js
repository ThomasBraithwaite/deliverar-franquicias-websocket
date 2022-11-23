const helper = require("./helpers");
const fs = require('fs')
const OrderProviderHistoryModel = require("./models/order_provider_history.model");
const OrderClientHistoryModel = require("./models/order_client_history.model");
const { ProveedorModel } = require("./models/proveedor.model");
const { ProductModel } = require("./models/product.model");
const FranquiciaModel = require("./models/meal.model");

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
            const { _id, ...propsProduct } = product 
            const producto = propsProduct._doc.producto 
            const { cantidad } = producto
            await ProductModel.findOneAndUpdate({codigo_producto: producto.codigo_producto},
                {
                    $set: {
                        codigo_producto: producto.codigo_producto,
                        descripcion: producto.descripcion,
                        precio: producto.precio
                    },
                    $inc: {
                        cantidad: cantidad
                    }
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
        
        if (hayComidas(message.meals)) {
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
            }]);
        } else {
            const franquicia = await FranquiciaModel.findOne({});
            // Enviar al cliente la orden rechazada
            await axios.post('http://core.deliver.ar/publicarMensaje?canal=franquicia', {
                mensaje: { 
                    order_id: message.order_id, 
                    order_status: "RECHAZADO",
                    franchise_address: franquicia.direccion,
                    client_address: message.client_address
                },
                tipo: 'actualizacion-pedido'
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Guardar en nuestra DB la orden rechazada
            await OrderClientHistoryModel.insertMany([{
                estado_orden: "RECHAZADO",
                comidas: message.meals.map(x => {
                    const { quantity, ...meal } = x
                    return {
                        comida: meal,
                        cantidad: quantity
                    }
                }),
                direccion_destino : message.client_address,
                order_id: message.order_id
            }]);
        }
    }
}

// Si hay productos para hacer la comida devuelve 'true', sino 'false'
async function hayComidas(comidas) {
    // Diccionario para llevar la cuenta del stock para cada comida
    let stock_productos = {};
    let falta_stock = false;
    
    // Recorre las comidas pedidas
    for (let i=0; i<comidas.length && !falta_stock; i++) {
        const productos = comidas[i].productos;

        // Recorre los productos de cada comida 
        for (let j=0; j<productos.length && !falta_stock; j++) {
            let stock_actual = 0;

            /* Sino existe el producto en el diccionario lo trae de la DB y agrega el stock */
            if (!(productos[j].codigo_producto in stock_productos)) {
                stock_actual = await ProductModel.findOne({ codigo_producto:    productos[j].codigo_producto });
                stock_productos[productos[j].codigo_producto] = stock_actual;
            }

            if (stock_productos[productos[j].codigo_producto] >= 
                    comidas[i].quantity) {
                stock_productos[productos[j].codigo_producto] -= comidas[i].quantity;
            } else {
                falta_stock = true;
            }
        }
    }
    return !falta_stock;
}

module.exports = {
    processMessage
}