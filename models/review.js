// models/review.js
const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  user_id: { type: String, required: true },
  comment: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const reviewSchema = new mongoose.Schema({
  content_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true },
  rating: { type: Number, min: 1, max: 10 },
  comment: { type: String },
  created_at: { type: Date, default: Date.now },
  is_spoiler: { type: Boolean, default: false },
  likes_count: { type: Number, default: 0 },
  replies: [replySchema],
});

module.exports = mongoose.model('Review', reviewSchema, 'reviews');