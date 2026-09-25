import { buildListingFormData } from './listingForm.js';

export function getAvailabilityErrorMessage(error) {
  if (error?.status === 403) return 'You do not own this listing';
  if (error?.status === 404) return 'This listing no longer exists. Refresh the page to update your listings.';
  if (Number.isInteger(error?.status) && error instanceof Error) return error.message;
  return 'Unable to update this listing. Check your connection and try again.';
}

function stringValue(value) {
  return typeof value === 'string' ? value : '';
}

export function prepareListingForEdit(listing = {}) {
  const retainedImages = Array.isArray(listing.images)
    ? listing.images.filter((image) => (
      typeof image?.url === 'string'
      && image.url
      && typeof image.publicId === 'string'
      && image.publicId
    ))
    : [];

  return {
    initialValues: {
      title: stringValue(listing.title),
      description: stringValue(listing.description),
      price: listing.price === null || listing.price === undefined ? '' : String(listing.price),
      category: stringValue(listing.category),
      condition: stringValue(listing.condition),
    },
    retainedImages,
  };
}

export function buildEditListingFormData(values, retainedImages, newFiles) {
  const body = buildListingFormData(values, newFiles);
  body.set(
    'retainedImagePublicIds',
    JSON.stringify(Array.from(retainedImages || [], (image) => image.publicId)),
  );
  return body;
}

export async function requestListingAvailabilityUpdate({
  listingId,
  sold,
  activeIds,
  request,
  signal,
  onPendingChange = () => {},
}) {
  if (activeIds.has(listingId)) return null;

  activeIds.add(listingId);
  onPendingChange(true);
  try {
    return await request(`/api/listings/${encodeURIComponent(listingId)}/sold`, {
      method: 'PATCH',
      auth: true,
      body: { sold },
      signal,
    });
  } finally {
    activeIds.delete(listingId);
    onPendingChange(false);
  }
}
