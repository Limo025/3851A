# Marketplace Admin Backend Design

## Intent and scope

Give a trusted operator the ability to permanently remove a listing and ban or unban a user. This is backend-only; no admin UI is part of this work. A banned account must not retain access through an already-issued Firebase token or an open WebSocket. Admin identity is configured on the server, never supplied by a client.

This is the first of three independent backend designs. Listing availability and watchlist behavior are specified separately.

## Existing system

The Express server is `Marketplace-backend/src/server.js`. Firebase tokens are verified by `src/middleware/auth.js`; the corresponding MongoDB user is stored in `src/models/User.js`. Listing owner deletion exists in `src/routes/listings.js` and removes Cloudinary images. Direct messages use `src/routes/chatRoutes.js` and `src/config/websocket.js`. Conversations reference listing IDs, and messages reference conversations.

## Design

- Configure one or more Firebase UIDs in server environment variable `ADMIN_UIDS` as a comma-separated list. Parse and trim at startup; an empty list grants no admin access. Do not add an endpoint for self-promotion and do not return the allowlist to clients.
- Add `isBanned` to `User`, defaulting to `false`. Authenticate a Firebase token, look up its UID in MongoDB, and reject banned or missing users before any authenticated marketplace action. Keep the user document on `req.currentUser` so handlers do not repeat the lookup. A banned user receives HTTP 403 with stable code `ACCOUNT_BANNED`; missing or invalid authentication receives 401.
- Admin authorization checks the verified UID against `ADMIN_UIDS` after authentication and the ban check. Non-admin users receive 403. An admin cannot ban their own UID or another configured admin UID. A ban can be reversed by an admin.
- Add `GET /api/admin/users?page=&limit=` returning a bounded, paginated list of `_id`, `uid`, `email`, `username`, `isBanned`, and `createdAt`. Never return credentials or tokens.
- Add `PATCH /api/admin/users/:id/ban` with JSON `{ "banned": true|false }`. The request must contain a real boolean. Invalid ObjectId or body yields 400; missing user yields 404. Repeating the same value is idempotent.
- Add `DELETE /api/admin/listings/:id`. Invalid ID yields 400; missing listing yields 404; success yields 204. Delete the listing record permanently, remove its recently-viewed and watchlist references, then attempt Cloudinary image cleanup. Image-provider failure is logged with the listing ID and image public IDs for manual retry and does not restore the deleted listing. Keep conversations and messages as historical records; conversation rendering must tolerate a missing listing rather than revealing or recreating it. The owner-delete route should share the same deletion service to prevent different cleanup behavior.
- Apply the ban check to authenticated listing, chat, recently-viewed, watchlist, assistant, and auth profile flows. For assistant optional authentication, an authenticated banned user is rejected; anonymous catalog queries remain permitted. During WebSocket upgrade, check the verified UID against MongoDB and reject banned users. On ban, close any currently connected sockets for that UID; message-sending routes still check the ban on each request.

## Safety and compatibility

- The server is the sole source of admin permission. Firebase ID token claims and frontend state do not grant admin rights.
- Existing users without `isBanned` behave as unbanned. No destructive user-account deletion is introduced.
- Administrative responses use the existing JSON error style and never expose provider errors or private authentication material.
- Listing deletion is permanent for the listing record. Images are external resources: cleanup failures require logging and an operator retry path, not a claim that image deletion succeeded.

## Acceptance criteria

- A valid non-admin token cannot access any admin endpoint; an anonymous request receives 401.
- A configured admin can list users, ban/unban ordinary users, and permanently delete a listing.
- A banned user with a previously issued token cannot create or modify listings, use private chat, write watchlist/recently-viewed entries, or use authenticated assistant actions. An already-open socket is closed.
- Admins cannot ban themselves or another configured admin UID.
- Deleting a listing removes catalog, watchlist, and recently-viewed references while preserving messages and handling their now-missing listing safely.
- Invalid IDs, malformed input, missing records, and storage-provider failure have deterministic results and tests.
