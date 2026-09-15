import express from 'express';
import { getAllConversations, getConversationWithName, getOrCreateConversation, getConversationWithItem, sendMessage } from '../controllers/messageController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

//consider using rate limiting

// One API to load the convo from the all contacts bar
router.get('/getorcreate/:userId', verifyToken, getOrCreateConversation)

router.get('/allContacts', verifyToken, getAllConversations)

// One API to find the convo with username of recipient
router.get('/getconvo/:username', verifyToken, getConversationWithName)

// One API to find the convo with item name
router.get('/getconvo/:listingname', verifyToken, getConversationWithItem)

// POST 
router.post('/send/:userId', verifyToken, sendMessage)

export default router;