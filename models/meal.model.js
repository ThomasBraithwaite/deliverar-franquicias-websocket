const mongoose = require("mongoose");
const { ProductSchema } = require("./product.model");

const MealSchema = new mongoose.Schema({
    nombre: {
        type: String,
        trim: true,
        required: true
    },
    descripcion: {
        type: String,
        trim: true,
        required: false
    },
    url_foto: {
        type: String,
        trim: true
    },
    precio: {
        type: Number,
        min: 1,
        required: true
    },
    productos: [
        {
            type: ProductSchema,
            require: true
        }
    ]
});

module.exports = {
    MealModel: mongoose.model("Meal", MealSchema),
    MealSchema: MealSchema,
};