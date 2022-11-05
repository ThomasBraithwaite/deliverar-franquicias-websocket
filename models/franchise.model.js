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
    }
});

module.exports = mongoose.model("Franchise", FranchiseSchema);
