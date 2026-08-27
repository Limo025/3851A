import { createHash } from 'node:crypto';
import { cloudinaryConfig, validateCloudinaryConfig } from '../config/cloudinary.js';

const CLOUDINARY_FOLDER = 'marketplace/listings';

function signParams(params, apiSecret) {
  const signedParams = Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return createHash('sha1').update(`${signedParams}${apiSecret}`).digest('hex');
}

function uploadUrl(cloudName) {
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
}

function destroyUrl(cloudName) {
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`;
}

function cloudinaryError(status) {
  return new Error(`Cloudinary request failed${status ? ` (${status})` : ''}`);
}

export function createImageStorage({
  fetchImpl = globalThis.fetch,
  config = cloudinaryConfig,
  now = () => Date.now(),
} = {}) {
  async function request(url, formData) {
    let response;

    try {
      response = await fetchImpl(url, { method: 'POST', body: formData });
    } catch {
      throw cloudinaryError();
    }

    if (!response?.ok) {
      throw cloudinaryError(response?.status);
    }

    try {
      return await response.json();
    } catch {
      throw cloudinaryError(response.status);
    }
  }

  function signedFormData(params, activeConfig) {
    const formData = new FormData();
    const timestamp = Math.floor(now() / 1000);
    const signedParams = { ...params, timestamp };

    formData.set('api_key', activeConfig.apiKey);
    for (const [key, value] of Object.entries(signedParams)) {
      formData.set(key, String(value));
    }
    formData.set('signature', signParams(signedParams, activeConfig.apiSecret));

    return formData;
  }

  async function destroyImage(publicId) {
    const activeConfig = validateCloudinaryConfig(config);
    const formData = signedFormData({ public_id: publicId }, activeConfig);
    await request(destroyUrl(activeConfig.cloudName), formData);
  }

  return {
    async uploadImages(files) {
      const activeConfig = validateCloudinaryConfig(config);
      const uploadedImages = [];

      try {
        for (const file of files) {
          const formData = signedFormData({ folder: CLOUDINARY_FOLDER }, activeConfig);
          const blob = new Blob([file.buffer], { type: file.mimetype });
          formData.set('file', blob, file.originalname || 'image');

          const response = await request(uploadUrl(activeConfig.cloudName), formData);
          if (!response?.secure_url || !response.public_id) {
            throw cloudinaryError();
          }

          uploadedImages.push({ url: response.secure_url, publicId: response.public_id });
        }
      } catch (error) {
        if (uploadedImages.length > 0) {
          try {
            await this.deleteImages(uploadedImages.map(({ publicId }) => publicId));
          } catch {
            // Preserve the upload failure; callers can log an explicit delete failure.
          }
        }
        throw error;
      }

      return uploadedImages;
    },

    async deleteImages(publicIds) {
      const results = await Promise.allSettled(publicIds.map((publicId) => destroyImage(publicId)));
      const failures = results
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason);

      if (failures.length > 0) {
        throw new AggregateError(failures, 'Failed to delete one or more Cloudinary images');
      }
    },
  };
}

const imageStorage = createImageStorage();

export default imageStorage;
