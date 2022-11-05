const mongoose = require("mongoose");
const { MealSchema } = require("./meal.model")

const OrderClientHistorySchema = new mongoose.Schema({
    estado_orden: {
        type: String,
        required: true
    },
    direccion_destino: {
        type: String,
        trim: true,
        required: true
    },
    comidas: [
        {
            comida: {
                type: MealSchema
            },
            cantidad: {
                type: Number,
                required: true
            }
        }
    ]
});

module.exports = mongoose.model("ClientOrderHistory", OrderClientHistorySchema);
