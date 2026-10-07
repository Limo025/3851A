import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  score: { type: Number, min: 1, max: 5, required: true },
}, { timestamps: true });
schema.index({ reviewer: 1, user: 1 }, { unique: true });
export default mongoose.model('Rating', schema);
