const mongoose = require("mongoose");

const ProveedorSchema = new mongoose.Schema({
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
    porcentaje: {
        type: Number,
        trim: true
    },
    fecha_vigencia: {
        type: Date,
        trim: true
    },
    estado_oferta: {
        type: String,
        trim: true
    },
    fecha_alta: {
        type: Date,
        trim: true
    },
    id_proveedor: {
        type: Number,
        trim: true
    }
});

module.exports = {
    ProveedorModel: mongoose.model("Proveedor", ProveedorSchema),
    ProveedorSchema: ProveedorSchema,
};