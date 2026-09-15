import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import Listing from '../models/Listing.js'
import { cloudinaryConfig, validateCloudinaryConfig } from '../config/cloudinary.js';
import User from '../models/User.js';
// Maybe can extend it to seller and buyer page seperately (which mode ur in based on if ur sender or ur receiver)

const getUserId = (req) => req.user?.uid || req.user?.user_id || req.user?._id;
// Fetch all user's conversation
export const getAllConversations = async (req, res) => {
  try {
    
    const userId = getUserId(req);
    const { role } = req.query;
    let filter = {buyer: userId};   //Default to buyer
    if (role === 'seller') {
      filter = { seller: userId };
    } 
    const conversations = await Conversation.find(filter)
    .populate('buyerDetails', 'username uid')
    .populate('sellerDetails', 'username uid')
    .populate('listing', 'title price image')
    .sort({ lastMessageAt: -1 });
    res.json(conversations);
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

export const getConversationWithName = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { username: recipientName } = req.params;
    const recipient = await User.findOne({ username: recipientName });
    const recipientId = recipient.uid
    if (!recipientId) {
       return res.status(400).json({ error: "Recipient name missing from parameter, cannot perform request"});    // make this a toast on the front end
    }
    const conversations = await Conversation.find({ $or: [{ buyer: recipientId }, { seller: recipientId }] })
    .populate('buyerDetails', 'username uid')
    .populate('sellerDetails', 'username uid')
    .populate('listing', 'title price image')
    .sort({ lastMessageAt: -1 });
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
    const conversation = await Conversation.findOne({ listing: listing._id, $or: [{ buyer: userId }, { seller: userId }] })
    .populate('buyerDetails', 'username uid')
    .populate('sellerDetails', 'username uid')
    .populate('listing', 'title price image')
    .sort({ lastMessageAt: -1 });
    if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      return res.status(200).json(conversation);
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
}

// Get or create a conversation between two users
export const getOrCreateConversation = async (senderId, recipientId, listing) => {
  let conversation = await Conversation.findOne({
    buyer: senderId,
    seller: recipientId,
    listing: listing,
  });
  if (!conversation) {
    conversation = await Conversation.create({
      buyer: senderId,
      seller: recipientId,
      listing: listing
    });
  }
  return conversation;
};

export const sendMessage = async (req, res) => {
  try { 
    const { text, image, listingId } = req.body;
    const { userId: recipientId } = req.params;
    const senderId = getUserId(req)

    if (!listingId) {
      return res.status(400).json({ error: 'listing Id is required to route message' });
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