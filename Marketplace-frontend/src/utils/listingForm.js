export const LISTING_CATEGORIES = Object.freeze([
  'Books and Textbooks',
  'Electronics',
  'Furniture and Home',
  'Clothing and Accessories',
  'Sports and Recreation',
  'Other',
]);

export const LISTING_CONDITIONS = Object.freeze(['New', 'Like New', 'Good', 'Fair']);

export const MAX_LISTING_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

export function validateImageSelection({ retainedCount, newFiles, selectedFiles }) {
  const currentFiles = Array.from(newFiles || []);
  const candidates = Array.from(selectedFiles || []);

  if (candidates.some((file) => !ACCEPTED_IMAGE_TYPES.includes(file.type))) {
    return { files: currentFiles, error: 'Images must be JPEG, PNG, or WebP files.' };
  }
  if (candidates.some((file) => file.size > MAX_IMAGE_BYTES)) {
    return { files: currentFiles, error: 'Each image must be 5 MB or smaller.' };
  }
  if (Number(retainedCount || 0) + currentFiles.length + candidates.length > MAX_LISTING_IMAGES) {
    return { files: currentFiles, error: 'A listing can have up to 5 images.' };
  }

  return { files: [...currentFiles, ...candidates], error: '' };
}

export function createImagePreviews(files, createObjectURL = URL.createObjectURL) {
  return Array.from(files || [], (file) => ({ file, url: createObjectURL(file) }));
}

export function revokeImagePreviews(previews, revokeObjectURL = URL.revokeObjectURL) {
  previews.forEach(({ url }) => revokeObjectURL(url));
}

export function validateListingValues(values, imageCount) {
  const errors = {};
  const title = String(values.title || '').trim();
  const description = String(values.description || '').trim();
  const price = Number(values.price);

  if (title.length < 3 || title.length > 120) {
    errors.title = 'Title must be between 3 and 120 characters.';
  }
  if (description.length < 10 || description.length > 5000) {
    errors.description = 'Description must be between 10 and 5000 characters.';
  }
  if (!Number.isFinite(price) || price <= 0) {
    errors.price = 'Price must be greater than 0.';
  }
  if (!LISTING_CATEGORIES.includes(values.category)) {
    errors.category = 'Select a valid category.';
  }
  if (!LISTING_CONDITIONS.includes(values.condition)) {
    errors.condition = 'Select a valid condition.';
  }
  if (imageCount < 1) {
    errors.images = 'Add at least one image.';
  } else if (imageCount > MAX_LISTING_IMAGES) {
    errors.images = 'A listing can have up to 5 images.';
  }

  return errors;
}

export function buildListingFormData(values, newFiles) {
  const body = new FormData();
  body.set('title', values.title ?? '');
  body.set('description', values.description ?? '');
  body.set('price', values.price ?? '');
  body.set('category', values.category ?? '');
  body.set('condition', values.condition ?? '');
  Array.from(newFiles || []).forEach((file) => body.append('images', file));
  return body;
}

export async function runSingleSubmission(lock, operation) {
  if (lock.current) return false;

  lock.current = true;
  try {
    return await operation();
  } finally {
    lock.current = false;
  }
}
