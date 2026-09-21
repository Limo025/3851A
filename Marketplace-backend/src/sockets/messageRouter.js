// import { getConnection } from './connectionMap.js';
// import { Message } from '../models/Message.js';
// import { Conversation } from '../models/Conversation.js';

// export const handleMessage = async (senderWs, rawData) => {
//   try {
//     const { type, payload } = JSON.parse(rawData);

//     switch (type) {
//       case 'SEND_MESSAGE': {
//         const { conversationId, text } = payload;
//         const senderId = senderWs.userId;
//         const recipientId = conversation.buyer === senderId ? conversation.seller : conversation.buyer;

//         // Get/Create conversation record
//         const conversation = await Conversation.findOne({_id: conversationId,
//           $or: [
//             { buyer: senderId },
//             { seller: senderId },
//           ],
//         });

//         // Update conversation last message timestamp
//         await Conversation.findByIdAndUpdate(conversation._id, {
//           lastMessage: text,
//           lastMessageAt: new Date()
//         });

//         const outputPayload = {
//           type: 'NEW_MESSAGE',
//           payload: newMessage
//         };

//         // Send back to sender (confirmation)
//         senderWs.send(JSON.stringify(outputPayload));

//         // Send to recipient if currently connected
//         const recipientWs = getConnection(recipientId);
//         if (recipientWs && recipientWs.readyState === 1) {
//           recipientWs.send(JSON.stringify(outputPayload));
//         }
//         break;
//       }
//       default:
//         console.log('Unknown WebSocket event type:', type);
//     }
//   } catch (err) {
//     console.error('Error handling WebSocket message:', err);
//   }
// };