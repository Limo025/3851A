# Basic Marketplace Listings Design

**Date:** 2026-08-27

## Objective

Extend the existing marketplace application with a focused listing system. Authenticated users can create, view, edit, and delete their own listings. All users can browse, search, filter, sort, and view listing details. Images are stored in Cloudinary; MongoDB stores only image URLs and Cloudinary public IDs.

This design does not include carts, checkout, payments, orders, shipping, messaging, seller ratings, reviews, watchlists, or recommendations.

## Existing System

The frontend uses React 19, Vite, and React Router. React renders routed page content into `#root`, while the header, search bar, sidebar, and footer are currently defined in `Marketplace-frontend/index.html`. Styling is global and concentrated in `src/css/index.css`.

The backend uses Express 5 with ES modules. `src/server.js` configures CORS and JSON parsing, mounts `/auth`, connects to MongoDB through Mongoose, and starts the HTTP server. Authentication uses Firebase Admin. Registration creates both a Firebase identity and a MongoDB `User`; login returns Firebase ID and refresh tokens. `verifyToken` validates bearer ID tokens and assigns the decoded Firebase identity to `req.user`.

The MongoDB `User` document contains a Firebase UID, email, username, and creation date. Listing ownership will reference the MongoDB user `_id`, while request authentication will continue to use Firebase UID values.

The frontend login currently discards returned tokens. Protected seller actions therefore require a small session and API-client layer. This is an integration addition, not a replacement for the existing registration, login, Firebase, or MongoDB authentication flow.

## Architectural Approach

The listing feature will follow the project's current direct Express-router and Mongoose-model structure. It will add focused modules for listing persistence, validation, image upload, and image cleanup without introducing controllers, repositories, state-management libraries, or a new design system.

Cloudinary uploads will be mediated by the backend:

1. The frontend sends listing fields and up to five images as `multipart/form-data`.
2. Multer keeps accepted files in memory and enforces count, MIME-type, and size limits.
3. The backend uploads accepted files to Cloudinary.
4. The listing document stores only `{ url, publicId }` for each image.

This approach keeps Cloudinary credentials out of the browser, centralizes validation, and permits cleanup when an upload or database operation fails. A maximum of five images at 5 MB each is sufficient for the initial release. Accepted MIME types are JPEG, PNG, and WebP.

## Listing Data Model

`Listing` will contain:

```js
{
  seller: ObjectId,          // required ref to User
  title: String,             // required, trimmed, 3-120 characters
  description: String,       // required, trimmed, 10-5000 characters
  price: Number,             // required, finite, greater than zero
  category: String,          // required, controlled value
  condition: String,         // New | Like New | Good | Fair
  images: [
    {
      url: String,           // required HTTPS Cloudinary URL
      publicId: String       // required Cloudinary asset identifier
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

Mongoose timestamps will provide `createdAt` and `updatedAt`. A new listing requires at least one image and allows no more than five. An edited listing must also retain at least one image.

Because the repository has no existing category vocabulary, the initial controlled categories will be:

- Books and Textbooks
- Electronics
- Furniture and Home
- Clothing and Accessories
- Sports and Recreation
- Other

The backend owns the authoritative allowlist. The frontend mirrors these presentation choices, while the backend rejects values outside the allowlist. Conditions use the same controlled-value approach.

Indexes will be limited to common access paths:

- `{ seller: 1, createdAt: -1 }` for the seller's listings
- `{ createdAt: -1 }` for the default marketplace order
- `{ category: 1, condition: 1, price: 1 }` for common filters

Title search will initially use an escaped, case-insensitive regular expression. A text index is not necessary for the anticipated MVP dataset and can be added later if measured query performance warrants it.

## Authentication and Authorization

Existing Firebase authentication remains authoritative.

The frontend will retain the ID token, refresh token, and expiry returned from `/auth/login` in `sessionStorage`. A small API client will attach the current ID token to protected requests and obtain a replacement ID token through Firebase's secure-token endpoint when expiry requires it. Closing the browser session signs the user out locally. No credentials or seller IDs are placed in listing payloads.

On each protected listing route:

1. `verifyToken` validates the bearer token.
2. The route resolves `User.findOne({ uid: req.user.uid })`.
3. Creation assigns that user's MongoDB `_id` as `seller`.
4. Update and deletion load the listing by ID, then explicitly compare its seller ID with the authenticated user's MongoDB ID before mutation.

Authentication failures return `401`. An authenticated user attempting to mutate another user's listing receives `403`. Missing listings return `404`. Malformed MongoDB IDs return `400` and never reach a database cast error response.

Public responses populate only safe seller fields: `_id` and `username`. Email, Firebase UID, and other user data are not exposed.

## HTTP API

All listing endpoints use the `/api/listings` prefix.

### Public endpoints

`GET /api/listings`

Supported query parameters:

- `search`: trimmed title search, maximum 100 characters
- `category`: one allowed category
- `condition`: one allowed condition
- `minPrice`: finite non-negative number
- `maxPrice`: finite non-negative number, not less than `minPrice`
- `sort`: `newest`, `oldest`, `price_asc`, or `price_desc`
- `page`: positive integer, default 1
- `limit`: positive integer, default 20, maximum 50

Arbitrary MongoDB operators and sort fields are never accepted. Search text is escaped before constructing a regular expression. Unknown query keys are ignored, while recognized but invalid values return `400` with a clear error.

Response:

```json
{
  "listings": [],
  "page": 1,
  "pages": 1,
  "total": 0
}
```

`GET /api/listings/:id` returns one populated listing or `404`.

### Protected endpoints

- `GET /api/listings/mine` returns only the authenticated user's listings.
- `POST /api/listings` creates a listing from multipart fields and image files.
- `PUT /api/listings/:id` edits only an owned listing.
- `DELETE /api/listings/:id` deletes only an owned listing.

`/mine` will be declared before `/:id` so Express does not treat `mine` as a MongoDB identifier.

Successful creation returns `201` and the created listing. Successful updates return `200` and the updated listing. Successful deletion returns `200` with a confirmation message. Validation errors return `400` using the existing `{ error: "..." }` response convention.

## Image Lifecycle

### Creation

The backend validates the complete request before uploading when possible. If one of several Cloudinary uploads fails, already uploaded assets from that request are deleted. If MongoDB persistence fails after uploads complete, all newly uploaded assets are deleted before returning an error.

### Editing

The edit request identifies retained existing images by their public IDs and may include new image files. The backend verifies ownership before uploading anything. It validates that retained plus new images will total between one and five.

The database update occurs after new uploads succeed. Once the updated listing is saved, obsolete Cloudinary assets are removed. If database persistence fails, only newly uploaded images are cleaned up and the original listing remains unchanged. If post-save deletion of an obsolete Cloudinary asset fails, the listing update remains successful and the cleanup failure is logged without exposing credentials or internal error details.

### Deletion

The backend verifies ownership, deletes the MongoDB listing, and then attempts to remove all associated Cloudinary assets. Cloudinary cleanup is best effort after database deletion; failures are logged for operational follow-up and do not recreate the listing.

## Frontend Design

New routes:

- `/marketplace` — browse, search, filter, sort, and paginate listings
- `/listings/:id` — listing detail and image gallery
- `/sell` — authenticated listing creation
- `/my-listings` — authenticated user's listings
- `/listings/:id/edit` — authenticated owner edit screen

The existing header search will navigate to `/marketplace?search=<term>`. The existing Sell sidebar entry will navigate to `/sell`. Public marketplace and detail pages do not require login. Seller routes detect a missing session and redirect to `/login` with a clear prompt.

Reusable components are limited to natural repetition:

- `ListingCard` renders marketplace and seller-listing summaries.
- `ListingGrid` renders loading, empty, error, and populated states.
- `ListingFilters` owns browse query controls.
- `ListingForm` is shared by create and edit pages.
- `ImageUploader` previews selected and retained images and enforces client-side count/type/size feedback.

The frontend will still rely on backend validation and authorization. Client checks exist only to improve feedback.

The listing UI will extend the existing blue, white, black, FuseV2, and Corbel visual language. Responsive grids will use CSS media queries for desktop, tablet, and mobile. Existing authentication pages and the broader page shell will not be redesigned.

The detail page shows the gallery, title, price, description, category, condition, seller username, and creation date. A disabled or informational `Contact Seller` control may state that messaging is not yet available; it will not simulate a transaction or initiate messaging.

## Error and State Handling

Every listing page will represent:

- loading
- successful data
- no results or no owned listings
- validation errors
- upload or API failure
- missing listing
- expired or missing authentication for seller actions

Create and edit forms disable repeated submission while a request is active. Delete requires an explicit confirmation dialog. API error messages shown to users will be understandable and will not expose stack traces, database details, Cloudinary credentials, or Firebase internals.

The backend will include a listing-specific error boundary that translates Multer size/count/type failures, Mongoose validation failures, malformed IDs, and unexpected failures into controlled JSON responses.

## Files and Dependencies

Expected backend additions:

- `src/models/Listing.js`
- `src/routes/listings.js`
- `src/config/cloudinary.js`
- `src/middleware/upload.js`
- `src/services/imageStorage.js`
- `src/validation/listingValidation.js`
- focused tests under `test/`

Expected backend modifications:

- `.env.example`
- `package.json` and `package-lock.json`
- `src/server.js`

Expected frontend additions:

- `src/api/client.js`
- `src/auth/session.js`
- listing pages and reusable listing components
- a focused listing stylesheet if global CSS would otherwise become difficult to maintain

Expected frontend modifications:

- `src/main.jsx`
- `src/pages/Login.jsx`
- `index.html`
- `src/css/index.css`

Backend runtime dependencies:

- `cloudinary`
- `multer`

No new frontend dependency is required. Tests will prefer Node's built-in test runner and small fakes around image storage. A test-only dependency will be introduced only if endpoint-level testing cannot be expressed cleanly without it.

Environment additions:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Secrets remain ignored and are never committed. Existing MongoDB and Firebase configuration is preserved.

## Implementation Sequence

1. Install existing dependencies and record the lint/build baseline.
2. Add pure listing validation and query-parsing tests.
3. Add the `Listing` model and its focused indexes.
4. Add browse/detail APIs, protected ownership behavior, and API tests.
5. Add Multer and Cloudinary image lifecycle behavior with mocked storage tests.
6. Add session retention and the authenticated frontend API client.
7. Add marketplace browse and listing-detail pages.
8. Add create and own-listings pages.
9. Add edit and delete flows.
10. Connect header search, seller navigation, filtering, sorting, and pagination.
11. Verify responsive states and accessibility basics.
12. Run security, regression, lint, build, and end-to-end manual flows.

Each stage must leave existing registration and login behavior intact. Backend functionality will be verified before its corresponding UI is added.

## Testing Strategy

Automated tests will cover:

- listing-field validation and controlled values
- safe query parsing and sort whitelisting
- escaped search input
- malformed and nonexistent identifiers
- unauthenticated protected requests
- seller identity derived from authentication rather than request data
- User A being unable to update or delete User B's listing
- image count, size, and MIME restrictions
- cleanup after partial upload or persistence failure

Frontend lint and production build will be run after dependencies are installed. Existing authentication will receive explicit register/login regression checks.

Manual seller flow:

`Register/Login -> Create -> Upload -> Browse -> Detail -> Edit -> Delete`

Manual buyer flow:

`Marketplace -> Search -> Filter -> Sort -> Paginate -> Detail`

Manual security flow uses two distinct accounts and direct API requests to confirm cross-user updates and deletes return `403`.

## Completion Criteria

The feature is complete when existing registration/login still works; authenticated users can create, view, edit, and delete only their own listings; listing images are stored externally; public users can browse and inspect listings; search, filters, controlled sorting, and pagination work; responsive loading/empty/error states are present; invalid and hostile input receives controlled responses; cross-user mutations fail; and the available test, lint, and build checks pass.
