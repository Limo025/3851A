import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
    senderId: { type: String, ref: 'User', required: true },
    recipientId: { type: String, ref: 'User', required: true },
    text: { type: String},
    image: {type: String},
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const Message = mongoose.model('Message', messageSchema);