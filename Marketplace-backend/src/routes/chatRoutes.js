import express from 'express';
import { getAllConversations, getUnreadConversations, markConversationRead, getConversationWithName, getOrCreateConversation, getMessagesWithConvoId, getConversationWithItem, sendMessage } from '../controllers/messageController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

//consider using rate limiting

router.get('/', verifyToken, getAllConversations)
router.get('/unread', verifyToken, getUnreadConversations)
router.post('/messages/:conversationId/read', verifyToken, markConversationRead)

// One API to load the convo from the all contacts bar
router.get('/getorcreate/:userId', verifyToken, getOrCreateConversation)

// One API to find the convo with username of recipient
router.get('/getconvo/recipient/:username', verifyToken, getConversationWithName)

// One API to find the convo with item title    then i realise its more like finding it in the list of convos, the real one thats being sent is prolly the one with id
router.get('/getconvo/item/:listingname', verifyToken, getConversationWithItem)

router.get('/messages/:conversationId', verifyToken, getMessagesWithConvoId)
// POST 
router.post('/send/:userId', verifyToken, sendMessage)

export default router;
