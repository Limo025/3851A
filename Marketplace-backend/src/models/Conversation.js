import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    buyer: { type: String, ref: 'User', required: true },
    seller: { type: String, ref: 'User', required: true },
    listing: { type:mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

conversationSchema.virtual('buyerDetails', {
  ref: 'User',
  localField: 'buyer',
  foreignField: 'uid',
  justOne: true
});

// Virtual populate for seller using Firebase UID
conversationSchema.virtual('sellerDetails', {
  ref: 'User',
  localField: 'seller',
  foreignField: 'uid',
  justOne: true
});
// Prevent creating same conversation with same listing
conversationSchema.index({ participants: 1, listing: 1 }, { unique: true });

export const Conversation = mongoose.model('Conversation', conversationSchema);
