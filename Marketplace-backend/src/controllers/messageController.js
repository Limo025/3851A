import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import Listing from '../models/Listing.js'
import imageStorage from '../services/imageStorage.js';
import User from '../models/User.js';
import { broadcastMessage } from '../sockets/broadcastMessage.js';

const getUserId = (req) => req.user?.uid || req.user?.user_id || req.user?._id;
const populateConversation = (query) =>
  query
    .populate('buyerDetails', 'username uid')
    .populate('sellerDetails', 'username uid')
    .populate('listing', 'title price images');
// Fetch all user's conversation
export const getAllConversations = async (req, res) => {
  try {
    
    const userId = getUserId(req);
    const { role } = req.query;
    let filter = {buyer: userId};   //Default to buyer
    if (role === 'seller') {
      filter = { seller: userId };
    }
    const conversations = await populateConversation(
      Conversation.find(filter).sort({ lastMessageAt: -1 }),
    );
    res.status(200).json(conversations);
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const getUnreadConversations = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversations = await Conversation.find({
      $or: [
        { buyer: userId, seller: { $ne: userId } },
        { seller: userId, buyer: { $ne: userId } },
      ],
    }).select('_id buyer seller lastMessageAt lastMessageSenderId buyerReadAt sellerReadAt');
    const unreadConversations = conversations.filter((conversation) => {
      if (!conversation.lastMessageSenderId || conversation.lastMessageSenderId === userId) return false;
      const readAt = conversation.buyer === userId ? conversation.buyerReadAt : conversation.sellerReadAt;
      return !readAt || conversation.lastMessageAt > readAt;
    }).map((conversation) => ({
      id: String(conversation._id),
      role: conversation.buyer === userId ? 'buyer' : 'seller',
    }));
    res.json(unreadConversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread conversations' });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      $or: [{ buyer: userId }, { seller: userId }],
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    const readField = conversation.buyer === userId ? 'buyerReadAt' : 'sellerReadAt';
    conversation[readField] = new Date();
    await conversation.save();
    res.sendStatus(204);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
};

export const getConversationWithName = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { username: recipientName } = req.params;
    const recipient = await User.findOne({ username: recipientName });
    if (!recipient) {
      return res.status(404).json({ error: 'User not found' });
    }
    const recipientId = recipient.uid
    if (!recipientId) {
       return res.status(400).json({ error: "Recipient name missing from parameter, cannot perform request"});    // make this a toast on the front end
    }
    const conversations = await populateConversation(Conversation.find({
      $or: [
        { buyer: userId, seller: recipientId },
        { buyer: recipientId, seller: userId },
      ], }));

    return res.status(200).json(conversations);
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
}

export const getConversationWithItem = async (req, res) => {
  console.log("reached here")
  try {
    const userId = getUserId(req);
    const listingName = req.params.listingname ? decodeURIComponent(req.params.listingname) : null;
    if (!listingName) {
      return res.status(400).json({ error: "Listing name missing from parameter, cannot perform request"});    // make this a toast on the front end
    }
    const escapedListingName = listingName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const listing = await Listing.findOne({ title: new RegExp(`^${escapedListingName}$`, 'i') });
    if (!listing) {
      return res.status(400).json({ error: "Listing does not exist, please try again"});
    }
    const conversation = await populateConversation(Conversation.findOne({ listing: listing._id, $or: [{ buyer: userId }, { seller: userId }] }));
    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      return res.status(200).json(conversation);
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
}

export const getOrCreateConversation = async (req, res) => {
  try {
    const senderId = getUserId(req);
    const { userId: recipientId } = req.params;
    const { listingId } = req.query;

    if (!listingId) {
      return res.status(400).json({ error: 'listingId query param is required' });
    }

    const conversation = await getOrCreateConversationHelper(senderId, recipientId, listingId);
    const populatedConversation = await populateConversation(Conversation.findById(conversation._id));
    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });

    res.status(200).json({ conversation: populatedConversation, messages });
  } catch (error) {
    console.log('Error in getOrCreateConversationHandler: ', error.message);
    res.status(500).json({ error: 'Failed to get or create conversation' });
  }
}

// Get or create a conversation between two users
export const getOrCreateConversationHelper = async (senderId, recipientId, listing) => {
  const filter = {
    listing,
    $or: [
      { buyer: senderId, seller: recipientId },
      { buyer: recipientId, seller: senderId },
    ],
  };
  const existingConversation = await Conversation.findOne(filter);
  if (existingConversation) {
    return existingConversation;
  }
  try {
    return await Conversation.create({
      buyer: senderId,
      seller: recipientId,
      listing,
    });
  } catch (error) {
    // Another request may have created the same conversation between our findOne() and create().
    if (error?.code !== 11000) {
      throw error;
    }

    const concurrentConversation = await Conversation.findOne(filter);
    
    if (!concurrentConversation) {
      throw error;
    }
    return concurrentConversation;
  }
};

export const sendMessage = async (req, res) => {
  try { 
    const { text, image, listingId, conversationId: requestedConversationId } = req.body;
    const { userId: recipientId } = req.params;
    const senderId = getUserId(req)

    if (!requestedConversationId && !listingId) {
      return res.status(400).json({ error: 'Conversation ID or listing ID is required to route message' });
    }
    const normalizedText = typeof text === 'string' ? text.trim() : '';
    if (!normalizedText && !image) {
      return res.status(400).json({ error: 'Message text or image is required' });
    }
    if (image && !/^data:image\/(jpeg|png|webp|gif);base64,/i.test(image)) {
      return res.status(400).json({ error: 'Invalid message image' });
    }
    let conversation;
    if (requestedConversationId) {
      conversation = await Conversation.findOne({
        _id: requestedConversationId,
        $or: [
          { buyer: senderId, seller: recipientId },
          { buyer: recipientId, seller: senderId },
        ],
      });
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
    } else {
      conversation = await getOrCreateConversationHelper(senderId, recipientId, listingId);
    }
    const conversationId = conversation._id

    let imageUrl;

    if (image) {
      const uploadedImage = await imageStorage.uploadMessageImage(image);
      imageUrl = uploadedImage.url;
    }
    
    const newMessage = new Message({
      conversationId,
      senderId,
      recipientId,
      text: normalizedText,
      image: imageUrl,
    })
    await newMessage.save();

    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: normalizedText || (image ? 'Image' : ''),
        lastMessageAt: new Date(),
        lastMessageSenderId: senderId,
        [conversation.buyer === senderId ? 'buyerReadAt' : 'sellerReadAt']: new Date(),
      },
      { returnDocument: 'after' }
    );

    const populatedConversation = await populateConversation(
      Conversation.findById(conversationId),
    );

    broadcastMessage(
      recipientId,
      newMessage.toJSON(),
      populatedConversation.toJSON(),
    );

    res.status(201).json(newMessage)

  } catch (error) {
    console.log('Error in sendMessage controller: ', error.message);
    res.status(500).json({error: 'internal server error'})
  }
}

export const getMessagesWithConvoId = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;
    const { role } = req.query
    let filter = {buyer: userId, _id: conversationId};   //Default to buyer
    if (role === 'seller') {
      filter = { seller: userId, _id: conversationId };
    }

    const conversation = await populateConversation(Conversation.findOne(filter));
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (String(conversation.buyer) !== String(userId) && String(conversation.seller) !== String(userId)) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    res.status(200).json({ conversation, messages });
  } catch (error) {
    console.log('Error in getConversationById controller: ', error.message);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
};
