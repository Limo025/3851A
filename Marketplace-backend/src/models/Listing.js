import mongoose from 'mongoose';
import {
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  MAX_LISTING_IMAGES,
} from '../constants/listings.js';

const imageSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true,
    match: /^https:\/\//,
  },
  publicId: {
    type: String,
    required: true,
    trim: true,
  },
}, { _id: false });

const listingSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 120,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 5000,
  },
  price: {
    type: Number,
    required: true,
    validate: {
      validator: (price) => Number.isFinite(price) && price > 0,
      message: 'Price must be a finite number greater than zero',
    },
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: LISTING_CATEGORIES,
  },
  condition: {
    type: String,
    required: true,
    trim: true,
    enum: LISTING_CONDITIONS,
  },
  images: {
    type: [imageSchema],
    required: true,
    validate: {
      validator: (images) => images.length >= 1 && images.length <= MAX_LISTING_IMAGES,
      message: `Images must contain between 1 and ${MAX_LISTING_IMAGES} items`,
    },
  },
}, { timestamps: true });

listingSchema.index({ seller: 1, createdAt: -1 });
listingSchema.index({ createdAt: -1 });
listingSchema.index({ category: 1, condition: 1, price: 1 });

export default mongoose.model('Listing', listingSchema);
