const mongoose = require('mongoose');

const top10EntrySchema = new mongoose.Schema({
  position:   { type: Number, required: true },  // 1-10
  tmdbId:     { type: Number, default: null },
  title:      { type: String, default: '' },
  coverImage: { type: String, default: '' },
  year:       { type: Number, default: null },
  type:       { type: String, default: '' },      // Kdrama / Cdrama / Jdrama
}, { _id: false });

const top10Schema = new mongoose.Schema({
  region: { 
    type: String, 
    enum: ['Korean', 'Chinese', 'Japanese'], 
    required: true,
    unique: true 
  },
  entries: [top10EntrySchema],
}, { timestamps: true });

module.exports = mongoose.model('Top10', top10Schema);