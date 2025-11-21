const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    department: {
        type: String,
        required: true,
        index: true
    },
    lat: {
        type: Number,
        required: true
    },
    lon: {
        type: Number,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    source: {
        type: String,
        enum: ['initial', 'event', 'search'],
        default: 'search'
    }
}, {
    timestamps: true
});

// Index composé pour recherche rapide
citySchema.index({ name: 1, department: 1 });

const City = mongoose.model('City', citySchema);

module.exports = City;
