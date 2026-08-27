import express from 'express';
import mongoose from 'mongoose';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { listingImagesUpload } from '../middleware/upload.js';
import imageStorage from '../services/imageStorage.js';
import { parseListingQuery, validateListingFields, ValidationError } from '../validation/listings.js';

const SAFE_SELLER_FIELDS = '_id username';

async function verifyToken(req, res, next) {
  const { verifyToken: firebaseVerifyToken } = await import('../middleware/auth.js');
  return firebaseVerifyToken(req, res, next);
}

export function createListingRouter({
  ListingModel = Listing,
  UserModel = User,
  authenticate = verifyToken,
  uploadMiddleware = listingImagesUpload,
  imageStore = imageStorage,
} = {}) {
  const router = express.Router();

  router.post('/', authenticate, uploadMiddleware, async (req, res) => {
    const { value, errors } = validateListingFields(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Authentication is required' });
    }

    let uploadedImages = [];
    try {
      const seller = await UserModel.findOne({ uid: req.user.uid });
      if (!seller) {
        return res.status(401).json({ error: 'Authenticated user was not found' });
      }

      uploadedImages = await imageStore.uploadImages(req.files);
      const listing = await ListingModel.create({
        ...value,
        seller: seller._id,
        images: uploadedImages,
      });
      const populatedListing = await listing.populate('seller', SAFE_SELLER_FIELDS);

      return res.status(201).json(populatedListing);
    } catch {
      if (uploadedImages.length > 0) {
        try {
          await imageStore.deleteImages(uploadedImages.map(({ publicId }) => publicId));
        } catch {
          // The client must not receive storage-provider details when compensation fails.
        }
      }

      return res.status(500).json({ error: 'Failed to create listing' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const { filter, sort, page, limit } = parseListingQuery(req.query);
      const [listings, total] = await Promise.all([
        ListingModel.find(filter)
          .populate('seller', SAFE_SELLER_FIELDS)
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        ListingModel.countDocuments(filter),
      ]);

      return res.json({
        listings,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
        total,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Failed to fetch listings' });
    }
  });

  router.get('/:id', async (req, res) => {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ error: 'Listing id is invalid' });
    }

    try {
      const listing = await ListingModel.findById(req.params.id)
        .populate('seller', SAFE_SELLER_FIELDS)
        .lean();

      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }

      return res.json(listing);
    } catch {
      return res.status(500).json({ error: 'Failed to fetch listing' });
    }
  });

  return router;
}

export default createListingRouter();
