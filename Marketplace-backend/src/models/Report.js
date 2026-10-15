import mongoose from 'mongoose';
import { LISTING_REPORT_REASONS, REPORT_DESCRIPTION_LIMITS, USER_REPORT_REASONS } from '../constants/reports.js';

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['user', 'listing'], required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetListing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  targetLabel: { type: String, required: true, trim: true },
  reason: { type: String, required: true, enum: [...USER_REPORT_REASONS, ...LISTING_REPORT_REASONS] },
  description: { type: String, required: true, trim: true, minlength: REPORT_DESCRIPTION_LIMITS.min, maxlength: REPORT_DESCRIPTION_LIMITS.max },
  status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
}, { timestamps: true });

reportSchema.index({ reporter: 1, targetUser: 1 }, { unique: true, partialFilterExpression: { status: 'pending', targetType: 'user' } });
reportSchema.index({ reporter: 1, targetListing: 1 }, { unique: true, partialFilterExpression: { status: 'pending', targetType: 'listing' } });

export default mongoose.model('Report', reportSchema);
