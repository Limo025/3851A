import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: String, ref: 'User', required: true }], // User IDs
    listing: { type:mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Prevent creating same conversation with same listing
conversationSchema.index({ participants: 1, listing: 1 }, { unique: true });

export const Conversation = mongoose.model('Conversation', conversationSchema);