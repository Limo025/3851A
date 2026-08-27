import express from 'express';
import mongoose from 'mongoose';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { listingImagesUpload } from '../middleware/upload.js';
import imageStorage from '../services/imageStorage.js';
import { MAX_LISTING_IMAGES } from '../constants/listings.js';
import {
  parseListingQuery,
  parseRetainedImageIds,
  validateListingFields,
  ValidationError,
} from '../validation/listings.js';

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

  async function authorizeOwnedListing(req, res, next) {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) {
      return res.status(400).json({ error: 'Listing id is invalid' });
    }
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Authentication is required' });
    }

    try {
      const currentUser = await UserModel.findOne({ uid: req.user.uid });
      if (!currentUser) {
        return res.status(401).json({ error: 'Authenticated user was not found' });
      }

      const listing = await ListingModel.findById(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      if (listing.seller.toString() !== currentUser._id.toString()) {
        return res.status(403).json({ error: 'You do not own this listing' });
      }

      req.currentUser = currentUser;
      req.listing = listing;
      return next();
    } catch {
      return res.status(500).json({ error: 'Failed to authorize listing management' });
    }
  }

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

  router.get('/mine', authenticate, async (req, res) => {
    if (!req.user?.uid) {
      return res.status(401).json({ error: 'Authentication is required' });
    }

    try {
      const currentUser = await UserModel.findOne({ uid: req.user.uid });
      if (!currentUser) {
        return res.status(401).json({ error: 'Authenticated user was not found' });
      }

      const listings = await ListingModel.find({ seller: currentUser._id })
        .populate('seller', SAFE_SELLER_FIELDS)
        .sort({ createdAt: -1 })
        .lean();

      return res.json(listings);
    } catch {
      return res.status(500).json({ error: 'Failed to fetch listings' });
    }
  });

  router.put('/:id', authenticate, authorizeOwnedListing, uploadMiddleware, async (req, res) => {
    let uploadedImages = [];
    try {
      const listing = req.listing;

      const { value, errors } = validateListingFields(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join('; ') });
      }

      let retainedImagePublicIds;
      try {
        retainedImagePublicIds = parseRetainedImageIds(req.body.retainedImagePublicIds);
      } catch (error) {
        if (error instanceof ValidationError) {
          return res.status(400).json({ error: error.message });
        }
        throw error;
      }

      const existingImages = Array.isArray(listing.images) ? listing.images : [];
      const imagesByPublicId = new Map(existingImages.map((image) => [image.publicId, image]));
      if (
        new Set(retainedImagePublicIds).size !== retainedImagePublicIds.length
        || retainedImagePublicIds.some((publicId) => !imagesByPublicId.has(publicId))
      ) {
        return res.status(400).json({ error: 'Retained images must belong to this listing' });
      }

      const retainedImages = retainedImagePublicIds.map((publicId) => imagesByPublicId.get(publicId));
      const newFiles = Array.isArray(req.files) ? req.files : [];
      if (retainedImages.length + newFiles.length < 1 || retainedImages.length + newFiles.length > MAX_LISTING_IMAGES) {
        return res.status(400).json({ error: 'Images must contain between 1 and 5 items' });
      }

      if (newFiles.length > 0) {
        uploadedImages = await imageStore.uploadImages(newFiles);
      }

      listing.title = value.title;
      listing.description = value.description;
      listing.price = value.price;
      listing.category = value.category;
      listing.condition = value.condition;
      listing.images = [...retainedImages, ...uploadedImages];
      await listing.save();

      const retainedImageIds = new Set(retainedImagePublicIds);
      const obsoletePublicIds = existingImages
        .filter((image) => !retainedImageIds.has(image.publicId))
        .map((image) => image.publicId);
      if (obsoletePublicIds.length > 0) {
        try {
          await imageStore.deleteImages(obsoletePublicIds);
        } catch (error) {
          console.error('Failed to remove obsolete listing images', error);
        }
      }

      return res.json(listing);
    } catch {
      if (uploadedImages.length > 0) {
        try {
          await imageStore.deleteImages(uploadedImages.map(({ publicId }) => publicId));
        } catch (cleanupError) {
          console.error('Failed to remove newly uploaded listing images', cleanupError);
        }
      }

      return res.status(500).json({ error: 'Failed to update listing' });
    }
  });

  router.delete('/:id', authenticate, authorizeOwnedListing, async (req, res) => {
    try {
      const listing = req.listing;

      const publicIds = (Array.isArray(listing.images) ? listing.images : []).map(({ publicId }) => publicId);
      await listing.deleteOne();

      if (publicIds.length > 0) {
        try {
          await imageStore.deleteImages(publicIds);
        } catch (error) {
          console.error('Failed to remove deleted listing images', error);
        }
      }

      return res.status(204).end();
    } catch {
      return res.status(500).json({ error: 'Failed to delete listing' });
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
