const mongoose = require("mongoose");
const { ProductSchema } = require("./product.model");

const OrderProviderHistorySchema = new mongoose.Schema({
    estado_orden: {
        type: String,
        required: true
    },
    id_proveedor: {
        type: Number,
        required: true
    },
    productos: [
        {
            producto: {
                type: ProductSchema,
                required: true
            }
        }
    ]
});

module.exports = mongoose.model("OrderProviderHistory", OrderProviderHistorySchema);
