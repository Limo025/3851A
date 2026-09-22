# Marketplace Listing Availability Backend Design

## Intent and scope

Let sellers state how many items a listing offers, mark a listing as sold, and let buyers or the assistant see only listings still available. This design changes backend data and APIs only; it does not modify frontend pages.

## Existing system

Listings live in `Marketplace-backend/src/models/Listing.js`. `src/validation/listings.js` validates create/update fields and public filters. `src/routes/listings.js` implements create, owner update/delete, and public search. `src/services/assistantListingSearch.js` independently queries listings for assistant summaries and recommendations.

## Design

- Add `quantity` as a positive integer with default `1`, and `soldAt` as a nullable timestamp with default `null`. Quantity represents the number originally offered, not live stock; marking sold must not erase it. Do not introduce order or stock-decrement logic in this scope.
- Creation accepts an optional quantity and defaults it to `1`; update validates the same field. Reject non-integers, zero, negatives, and values above `999`. Existing MongoDB records without quantity are read as quantity `1` in API responses; do not require a migration for this feature.
- Add an owner-only `PATCH /api/listings/:id/sold` with `{ "sold": true|false }`. Set `soldAt` on the transition to sold, clear it on transition back to available, and make repeated requests idempotent. Reject non-boolean payloads and non-owners. Owner update does not implicitly reset sold status.
- Add `availableOnly=true|false` to `GET /api/listings`; `true` excludes records with a non-null `soldAt`, including legacy records where the field is absent. Invalid values yield 400. Preserve the existing pagination, price, category, condition, search, and sort behavior.
- Public detail may still show a sold listing with its sold status; buyers must see it is unavailable. Assistant summary and recommendation queries always exclude sold listings, so counts and price ranges describe only available items. Apply the same filter in both aggregate and find paths.
- Avoid broad migration or catalog refactoring. Existing indexes remain unchanged unless query measurement shows a new index is necessary.

## Acceptance criteria

- Legacy listings remain readable and behave as quantity `1`, available.
- Only the seller can mark or unmark their listing as sold; repeated requests do not change timestamps unexpectedly.
- Available-only search returns correct totals and pagination, including combined search/price/category filters.
- Assistant counts and recommendations exclude sold listings, including in aggregate-query paths.
- Invalid quantity and sold/filter values receive 400 without changing stored data.
