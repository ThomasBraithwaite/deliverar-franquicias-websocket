const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
    codigo_producto: {
        type: String,
        trim: true,
        required: true
    },
    descripcion: {
        type: String,
        trim: true,
        required: false
    },
    cantidad: {
        type: Number,
        required: true
    },
    precio: {
        type: Number,
        require: true
    },
});

module.exports = {
    ProductModel: mongoose.model("Product", ProductSchema),
    ProductSchema: ProductSchema,
};