import { getConnection } from './connectionMap.js';
import { getOrCreateConversation } from '../controllers/messageController.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';

export const handleMessage = async (senderWs, rawData) => {
  try {
    const { type, payload } = JSON.parse(rawData);

    switch (type) {
      case 'SEND_MESSAGE': {
        const { conversationId, recipientId, text } = payload;
        const senderId = senderWs.userId;

        // 1. Get/Create conversation record
        const conversation = await getOrCreateConversation(senderId, recipientId);

        // 2. Persist message to MongoDB
        const newMessage = await Message.create({
          conversationId: conversation._id,
          senderId,
          recipientId,
          text
        });

        // 3. Update conversation last message timestamp
        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: text,
          lastMessageAt: new Date()
        });

        const outputPayload = {
          type: 'NEW_MESSAGE',
          payload: newMessage
        };

        // 4. Send back to sender (confirmation)
        senderWs.send(JSON.stringify(outputPayload));

        // 5. Send to recipient if currently connected
        const recipientWs = getConnection(recipientId);
        if (recipientWs && recipientWs.readyState === 1) {
          recipientWs.send(JSON.stringify(outputPayload));
        }
        break;
      }
      default:
        console.log('Unknown WebSocket event type:', type);
    }
  } catch (err) {
    console.error('Error handling WebSocket message:', err);
  }
};