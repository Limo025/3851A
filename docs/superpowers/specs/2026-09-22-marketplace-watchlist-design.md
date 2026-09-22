# Marketplace Watchlist Backend Design

## Intent and scope

Allow a signed-in buyer to save and remove listings and retrieve only their own saved listings. This is a backend-only feature. It depends on the shared authentication/ban policy from the admin design and must tolerate permanently deleted listings.

## Existing system

`src/models/RecentlyViewed.js` demonstrates the existing MongoDB `(user, listing)` reference pattern. `src/routes/recentlyViewed.js` shows authenticated listing lookup and response shaping. Public listings contain safe seller fields; private user data must not leak through watchlist responses.

## Design

- Add a `Watchlist` model with `user` and `listing` ObjectId references plus `createdAt`. Create a unique compound index on `(user, listing)` and an index on `(user, createdAt)` for newest-first listing.
- Add `GET /api/watchlist?page=&limit=` returning a bounded, paginated list of populated listing summaries and pagination metadata. The user is derived only from the verified Firebase UID and MongoDB user; no client-supplied user ID is accepted. Omit stale entries whose listing no longer exists.
- Add `PUT /api/watchlist/:listingId` to save a listing. Validate ObjectId and listing existence; return 404 for deleted/nonexistent listings. Upsert makes repeated saves idempotent and the unique index prevents concurrent duplicates. Do not allow saving a sold listing; a listing sold after being saved may remain visible with sold status until the user removes it.
- Add `DELETE /api/watchlist/:listingId` to remove an entry; repeated removal succeeds without leaking whether another user saved it. A banned account receives the shared 403 `ACCOUNT_BANNED` response.
- Admin and owner listing deletion remove watchlist references using the shared deletion service specified by the admin design. A read still filters missing listings to remain robust if cleanup partially fails.

## Acceptance criteria

- Anonymous requests receive 401; a banned user receives 403; one user cannot read or change another user's watchlist.
- Invalid IDs receive 400; saving a missing or sold listing is rejected; repeated save/remove requests are safe.
- Concurrent saves produce one record, and pagination/order are deterministic.
- Deleted listings do not appear in watchlist results; no Firebase UID, email, or authentication data is returned in listing summaries.
