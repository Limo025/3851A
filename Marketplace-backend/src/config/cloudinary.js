export const cloudinaryConfig = Object.freeze({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
});

export function validateCloudinaryConfig(config = cloudinaryConfig) {
  if (!config?.cloudName || !config.apiKey || !config.apiSecret) {
    throw new Error('Cloudinary configuration is incomplete');
  }

  return config;
}
