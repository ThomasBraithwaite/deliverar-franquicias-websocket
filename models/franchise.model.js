const mongoose = require("mongoose");

const FranchiseSchema = new mongoose.Schema({
    nombre: {
        type: String,
        trim: true,
        required: true
    },
    direccion: {
        type: String,
        trim: true
    },
    foto_url: {
        type: String
    },
    cuit: {
        type: String
    }
});

module.exports = mongoose.model("Franchise", FranchiseSchema);
