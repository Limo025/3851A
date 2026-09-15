import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import Listing from '../models/Listing.js'
import { cloudinaryConfig, validateCloudinaryConfig } from '../config/cloudinary.js';
import User from '../models/User.js';
// Maybe can extend it to seller and buyer page seperately (which mode ur in based on if ur sender or ur receiver)

// Fetch all user's conversation
export const getAllConversations = async (req, res) => {
  try {
    const userId = req.user.uid || req.user.user_id || req.user._id;

    const conversations = await Conversation.find({ participants: userId })
    .populate({path: 'participants', model:'User', localField: 'participants', foreignField: 'uid', select: 'username'})
    .populate('listing', 'title price')
    .sort({ lastMessageAt: -1 });
    res.json(conversations);
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const getConversationWithName = async (req, res) => {
  try {
    const userId = req.user.uid || req.user.user_id || req.user._id;
    const { username: recipientName } = req.params;
    const recipient = await User.findOne({ username: recipientName });
    const recipientId = recipient.uid
    if (!recipientId) {
       return res.status(400).json({ error: "Recipient name missing from parameter, cannot perform request"});    // make this a toast on the front end
    }
    const conversations = await Conversation.find({ participants: {$all:[userId, recipientId]} })
    .populate({path: 'participants', model:'User', localField: 'participants', foreignField: 'uid', select: 'username'})
    .populate('listing', 'title price image')
    if (!conversations) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    return res.status(200).json(conversations);
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
}

export const getConversationWithItem = async (req, res) => {
  try {
    const userId = req.user.uid || req.user.user_id || req.user._id;
    const { listingname: listingName } = req.params
    console.log(listingName)
    if (!listingName) {
      return res.status(400).json({ error: "Listing name missing from parameter, cannot perform request"});    // make this a toast on the front end
    }
    const listing = await Listing.findOne({ title: listingName });
    if (!listing) {
      return res.status(400).json({ error: "Listing does not exist, please try again"});
    }
    const conversation = await Conversation.findOne({ listing: listing._id, participants: userId })
    .populate({path: 'participants', model: 'User', localField: 'participants', foreignField: 'uid', select: 'username uid'})
    .populate('listing', 'title price image')
    .sort({ lastMessageAt: -1 });
    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      return res.status(200).json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
}

// Get or create a conversation between two users
export const getOrCreateConversation = async (userId1, userId2, listingId) => {
  let conversation = await Conversation.findOne({
    participants: { $all: [userId1, userId2] },
    listing: listingId,
  });
  if (!conversation) {
    conversation = await Conversation.create({
      participants: [userId1, userId2],
      listing: listingId
    });
  }
  return conversation;
};

export const sendMessage = async (req, res) => {
  try { 
    const { text, image, listingId } = req.body;
    const { userId: recipientId } = req.params;
    const senderId = req.user.user_id;

    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required to route message' });
    }
    const conversation = await getOrCreateConversation(senderId, recipientId, listingId);
    const conversationId = conversation._id

    let imageUrl;

    if (image) {
      const uploadResponse = await validateCloudinaryConfig(cloudinaryConfig).uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }
    
    const newMessage = new Message({
      conversationId,
      senderId,
      recipientId,
      text,
      image: imageUrl,
    })
    await newMessage.save();

    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: text || (image ? '📷 Image' : ''),
        lastMessageAt: new Date()
      },
      { returnDocument: 'after' }
    );

    // todo: send msg in real time

    res.status(201).json(newMessage)

  } catch (error) {
    console.log('Error in sendMessage controller: ', error.message);
    res.status(500).json({error: 'internal server error'})
  }
}