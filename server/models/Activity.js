const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  latitude: { type: Number },
  longitude: { type: Number },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  category: { type: String, required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
