const helper = require("./helpers");
const fs = require('fs')
const OrderProviderHistoryModel = require("./models/order_provider_history.model");
const OrderClientHistoryModel = require("./models/order_client_history.model");
const { ProveedorModel } = require("./models/proveedor.model");
const { ProductModel } = require("./models/product.model");
const FranquiciaModel = require("./models/franchise.model");
const MealModel = require("./models/meal.model");
const axios = require("axios");

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
        }));
        
        // Publicamos las comidas con stock actualizado
        await publishMeals();
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
        
        const hayComida = await hayComidas(message.mensaje.meals);
        if (hayComida) {
            // Guardar pedido en nuestra DB
            await OrderClientHistoryModel.insertMany([{
                estado_orden: "PENDIENTE",
                comidas: message.mensaje.meals.map(x => {
                    const { cantidad, ...meal } = x
                    return {
                        comida: {
                            ...meal,
                            _id: meal._id.$oid,
                            productos: meal.productos.map(p => {
                                return {
                                    ...p,
                                    _id: p._id.$oid
                                }
                            })
                        },
                        cantidad: cantidad
                    }
                }),
                direccion_destino : message.mensaje.client_address,
                order_id: message.mensaje.order_id
            }]);
            
            // Reducir stock para 'reservar' el pedido
            message.mensaje.meals.map(async (meal) => {
                const { cantidad, ...comida } = meal;
                const stock_a_reservar = cantidad;
                
                comida.productos.map(async (producto) => {
                    await ProductModel.findOneAndUpdate({ codigo_producto: producto.codigo_producto },
                    { $inc: { cantidad: -stock_a_reservar }});
                });                
            });

            // Publicamos las comidas con stock actualizado
            await publishMeals();
        } else {
            const franquicia = await FranquiciaModel.findOne({cuit: "30-71446892-4"});
            // Enviar al cliente la orden rechazada
            await axios.post('http://core.deliver.ar/publicarMensaje?canal=franquicia', {
                mensaje: { 
                    order_id: message.mensaje.order_id, 
                    order_status: "RECHAZADO",
                    franchise_address: franquicia.direccion,
                    client_address: message.mensaje.client_address
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
                comidas: message.mensaje.meals.map(x => {
                    const { cantidad, ...meal } = x
                    return {
                        comida: meal,
                        cantidad: cantidad
                    }
                }),
                direccion_destino : message.mensaje.client_address,
                order_id: message.mensaje.order_id
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
                producto = await ProductModel.findOne({ codigo_producto:    productos[j].codigo_producto });
                stock_actual = producto.cantidad;
                stock_productos[productos[j].codigo_producto] = stock_actual;
            }

            if (stock_productos[productos[j].codigo_producto] >= 
                    comidas[i].cantidad) {
                stock_productos[productos[j].codigo_producto] -= comidas[i].cantidad;
            } else {
                falta_stock = true;
            }
        }
    }
    return !falta_stock;
}

exports.publishMeals = async () => {
    try{
        const meals = await MealModel.find({});
        const franquicia = await FranchiseSchema.findOne({});
        await axios.post('http://core.deliver.ar/publicarMensaje?canal=franquicia', {
            mensaje: { 
                meals,
                franquicia
            },
            tipo: 'listado'
        },
        {
            headers: {
                'Content-Type': 'application/json',
            },
        })
    }
    catch (e) {
        throw Error("Error while publishing meals");
    }
}

module.exports = {
    processMessage
}