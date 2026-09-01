# Basic Marketplace Listings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung hệ thống đăng tin marketplace cơ bản, an toàn và responsive vào ứng dụng hiện có mà không thay thế Firebase Authentication hoặc MongoDB.

**Architecture:** Backend Express tiếp tục dùng router trực tiếp với Mongoose model, bổ sung validation thuần, upload multipart qua Multer và lưu ảnh bên ngoài bằng Cloudinary. Frontend React bổ sung một lớp session/API nhỏ để dùng token Firebase hiện có, sau đó xây các trang browse/detail/create/edit/my-listings từ các component dùng lại được.

**Tech Stack:** React 19, React Router 7, Vite 8, Express 5, Mongoose 9, Firebase Admin, MongoDB, Multer, Cloudinary, Node.js test runner, Supertest.

**Spec:** `docs/superpowers/specs/2026-08-27-marketplace-listings-design.md`

## Global Constraints

- Không thay thế hoặc viết lại luồng đăng ký/đăng nhập Firebase hiện có.
- Không chuyển khỏi MongoDB/Mongoose.
- Public: browse và listing detail. Protected: create, mine, update, delete.
- Backend luôn suy ra seller từ Firebase token; không đọc hoặc tin `seller`/`sellerId` trong payload.
- Tối đa 5 ảnh/listing, mỗi ảnh tối đa 5 MB; chỉ JPEG, PNG và WebP.
- MongoDB chỉ lưu `{ url, publicId }`, không lưu Base64 hoặc binary ảnh.
- Giá phải là số hữu hạn lớn hơn 0; title 3–120 ký tự; description 10–5000 ký tự.
- Condition chỉ gồm `New`, `Like New`, `Good`, `Fair`.
- Category chỉ gồm `Books and Textbooks`, `Electronics`, `Furniture and Home`, `Clothing and Accessories`, `Sports and Recreation`, `Other`.
- Pagination mặc định 20, giới hạn tối đa 50.
- Không xây cart, checkout, payment, order, shipping, messaging, rating, review, watchlist hoặc recommendation.
- Mọi task dùng TDD khi có logic kiểm thử tự động được; mỗi task phải chạy lại test liên quan trước khi commit.
- Không commit `.env`, `credentials.json` hoặc Cloudinary credentials.

---

## File Map

### Backend

- `src/constants/listings.js`: các allowlist và giới hạn dùng chung.
- `src/validation/listings.js`: chuẩn hóa/validate field, query, ObjectId và retained-image payload.
- `src/models/Listing.js`: Mongoose schema và indexes.
- `src/config/cloudinary.js`: khởi tạo Cloudinary từ environment.
- `src/middleware/upload.js`: Multer memory upload và lỗi file.
- `src/services/imageStorage.js`: upload/delete Cloudinary, không chứa logic listing.
- `src/routes/listings.js`: HTTP routes, authentication, ownership và orchestration ảnh/database.
- `src/routes/auth.js`: thêm endpoint refresh token, giữ nguyên register/login/me.
- `src/server.js`: mount `/api/listings`.
- `test/*.test.js`: unit/API tests dùng `node:test` và Supertest.

### Frontend

- `src/auth/session.js`: lưu session, refresh token và trạng thái đăng nhập.
- `src/api/client.js`: public/authenticated fetch và chuẩn hóa lỗi.
- `src/components/RequireAuth.jsx`: bảo vệ seller pages.
- `src/components/ListingCard.jsx`: card dùng ở marketplace và my-listings.
- `src/components/ListingGrid.jsx`: loading/error/empty/data states.
- `src/components/ListingFilters.jsx`: search/filter/sort controls.
- `src/components/ImageUploader.jsx`: preview, retained/new images và client feedback.
- `src/components/ListingForm.jsx`: form chung cho create/edit.
- `src/pages/Marketplace.jsx`: query URL, gọi browse API và pagination.
- `src/pages/ListingDetail.jsx`: gallery và dữ liệu listing.
- `src/pages/CreateListing.jsx`: multipart create flow.
- `src/pages/EditListing.jsx`: load, authorize UX và multipart update flow.
- `src/pages/MyListings.jsx`: danh sách của user và delete confirmation.
- `src/css/listings.css`: style riêng của listing, responsive breakpoints.
- `src/main.jsx`: route registration.
- `src/pages/Login.jsx`: lưu token trả về trước khi navigate.
- `index.html` và `src/js/script.js`: điều hướng search/Sell tới route mới.

---

### Task 1: Listing constants và validation thuần

**Files:**
- Create: `Marketplace-backend/src/constants/listings.js`
- Create: `Marketplace-backend/src/validation/listings.js`
- Create: `Marketplace-backend/test/listingValidation.test.js`
- Modify: `Marketplace-backend/package.json`

**Interfaces:**
- Produces: `LISTING_CATEGORIES`, `LISTING_CONDITIONS`, `MAX_LISTING_IMAGES`, `MAX_IMAGE_BYTES`.
- Produces: `validateListingFields(input, options) -> { value, errors }`.
- Produces: `parseListingQuery(query) -> { filter, sort, page, limit }` hoặc ném `ValidationError`.
- Produces: `parseRetainedImageIds(raw) -> string[]`.

- [ ] **Step 1: Cài các backend dependency hiện có**

```powershell
npm install
```

Expected: cài đúng lockfile hiện có; chưa thêm Cloudinary, Multer hoặc Supertest ở bước này.

- [ ] **Step 2: Thêm test script và viết failing tests**

Trong `package.json` đổi script test thành:

```json
"test": "node --test test/*.test.js"
```

Test phải bao phủ ít nhất:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeRegex,
  parseListingQuery,
  parseRetainedImageIds,
  validateListingFields,
} from '../src/validation/listings.js';

test('validateListingFields rejects missing fields and non-positive price', () => {
  const result = validateListingFields({ title: '', description: '', price: 0 });
  assert.deepEqual(result.errors, [
    'Title must be between 3 and 120 characters',
    'Description must be between 10 and 5000 characters',
    'Price must be greater than 0',
    'Category is invalid',
    'Condition is invalid',
  ]);
});

test('parseListingQuery escapes search and whitelists sort', () => {
  assert.equal(escapeRegex('phone.*'), 'phone\\.\\*');
  const parsed = parseListingQuery({ search: ' phone.* ', sort: 'price_desc', page: '2', limit: '10' });
  assert.equal(parsed.filter.title.$regex.source, 'phone\\.\\*');
  assert.equal(parsed.filter.title.$regex.flags, 'i');
  assert.deepEqual(parsed.sort, { price: -1 });
  assert.equal(parsed.page, 2);
  assert.equal(parsed.limit, 10);
});

test('parseRetainedImageIds accepts JSON string arrays only', () => {
  assert.deepEqual(parseRetainedImageIds('["marketplace/a"]'), ['marketplace/a']);
  assert.throws(() => parseRetainedImageIds('{"bad":true}'), /retained images/i);
});
```

- [ ] **Step 3: Chạy test để xác nhận thất bại**

Run từ `Marketplace-backend`:

```powershell
npm test
```

Expected: FAIL vì `src/validation/listings.js` chưa tồn tại.

- [ ] **Step 4: Cài đặt constants và validation tối thiểu**

`constants/listings.js` export chính xác:

```js
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
```

`validation/listings.js` phải:

- trim chuỗi;
- chuyển price bằng `Number` và từ chối `NaN`, `Infinity`, `<= 0`;
- chỉ nhận category/condition trong constants;
- escape ký tự regex bằng `/[.*+?^${}()|[\]\\]/g`;
- map sort qua object cố định;
- validate `minPrice <= maxPrice`;
- bỏ qua query key không nhận diện;
- ném `ValidationError` có thuộc tính `errors` cho query sai;
- parse `retainedImagePublicIds` là JSON array chứa tối đa 5 chuỗi không rỗng.

- [ ] **Step 5: Chạy test và xác nhận pass**

```powershell
npm test
```

Expected: toàn bộ test Task 1 PASS.

- [ ] **Step 6: Commit**

```powershell
git add Marketplace-backend/package.json Marketplace-backend/src/constants/listings.js Marketplace-backend/src/validation/listings.js Marketplace-backend/test/listingValidation.test.js
git commit -m "feat: add listing validation rules"
```

---

### Task 2: Mongoose Listing model và indexes

**Files:**
- Create: `Marketplace-backend/src/models/Listing.js`
- Create: `Marketplace-backend/test/listingModel.test.js`

**Interfaces:**
- Consumes: constants từ Task 1.
- Produces: default Mongoose model `Listing` với `seller`, fields, images và timestamps.

- [ ] **Step 1: Viết failing schema tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Listing from '../src/models/Listing.js';

const valid = {
  seller: new mongoose.Types.ObjectId(),
  title: 'Graphing calculator',
  description: 'Working calculator in good condition.',
  price: 45,
  category: 'Electronics',
  condition: 'Good',
  images: [{ url: 'https://res.cloudinary.com/demo/image/upload/item.webp', publicId: 'marketplace/item' }],
};

test('valid listing passes synchronous validation', () => {
  assert.equal(new Listing(valid).validateSync(), undefined);
});

test('listing rejects zero price and no images', () => {
  const error = new Listing({ ...valid, price: 0, images: [] }).validateSync();
  assert.ok(error.errors.price);
  assert.ok(error.errors.images);
});

test('listing schema defines only the approved indexes', () => {
  const indexes = Listing.schema.indexes().map(([keys]) => keys);
  assert.deepEqual(indexes, [
    { seller: 1, createdAt: -1 },
    { createdAt: -1 },
    { category: 1, condition: 1, price: 1 },
  ]);
});
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

```powershell
node --test test/listingModel.test.js
```

Expected: FAIL vì model chưa tồn tại.

- [ ] **Step 3: Viết schema tối thiểu**

Dùng `new mongoose.Schema(..., { timestamps: true })`, `seller.ref = 'User'`, validator array yêu cầu `1..5` ảnh, enum lấy từ Task 1. `url` phải match `^https://`; `publicId` required và trim. Khai báo đúng ba compound indexes trong test.

- [ ] **Step 4: Chạy model và full tests**

```powershell
node --test test/listingModel.test.js
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add Marketplace-backend/src/models/Listing.js Marketplace-backend/test/listingModel.test.js
git commit -m "feat: add listing data model"
```

---

### Task 3: Public browse/detail API

**Files:**
- Create: `Marketplace-backend/src/routes/listings.js`
- Create: `Marketplace-backend/test/listingPublicRoutes.test.js`
- Modify: `Marketplace-backend/src/server.js`
- Modify: `Marketplace-backend/package.json`
- Modify: `Marketplace-backend/package-lock.json`

**Interfaces:**
- Consumes: `parseListingQuery`, `Listing`.
- Produces ở task này: `createListingRouter({ ListingModel = Listing } = {}) -> express.Router` và default configured router.
- Produces: `GET /api/listings`, `GET /api/listings/:id`.

- [ ] **Step 1: Cài Supertest và viết failing API tests**

```powershell
npm install --save-dev supertest
```

Test tạo Express app cục bộ, không mở port và không load Firebase credentials:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createListingRouter } from '../src/routes/listings.js';

function queryResult(value) {
  return {
    populate() { return this; }, sort() { return this; }, skip() { return this; },
    limit() { return this; }, lean: async () => value,
  };
}

test('GET / returns paginated listings', async () => {
  const ListingModel = {
    find: () => queryResult([{ _id: 'listing-1', title: 'Laptop' }]),
    countDocuments: async () => 1,
  };
  const app = express().use('/api/listings', createListingRouter({ ListingModel }));
  const response = await request(app).get('/api/listings?sort=newest&page=1&limit=20');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { listings: [{ _id: 'listing-1', title: 'Laptop' }], page: 1, pages: 1, total: 1 });
});

test('GET /:id rejects malformed ObjectId', async () => {
  const app = express().use('/api/listings', createListingRouter({ ListingModel: {} }));
  const response = await request(app).get('/api/listings/not-an-id');
  assert.equal(response.status, 400);
});
```

Thêm test `404`, filter/query invalid `400`, populate chỉ `_id username`, và pages bằng `Math.ceil(total / limit)` với pages tối thiểu bằng `1`.

- [ ] **Step 2: Chạy test để xác nhận thất bại**

```powershell
node --test test/listingPublicRoutes.test.js
```

Expected: FAIL vì router chưa tồn tại.

- [ ] **Step 3: Cài đặt router factory và public handlers**

Factory signature của task này:

```js
export function createListingRouter({
  ListingModel = Listing,
} = {}) { /* return router */ }

export default createListingRouter();
```

Task 4 mở rộng factory bằng các dependency upload/auth cần cho mutation routes. Commit Task 3 không được import file chưa tồn tại. Public query dùng `.populate('seller', '_id username')`, sort/skip/limit từ parser và `.lean()`.

Mount trong `server.js`:

```js
import listingRoutes from './routes/listings.js';
app.use('/api/listings', listingRoutes);
```

- [ ] **Step 4: Chạy route và full tests**

```powershell
node --test test/listingPublicRoutes.test.js
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add Marketplace-backend/package.json Marketplace-backend/package-lock.json Marketplace-backend/src/server.js Marketplace-backend/src/routes/listings.js Marketplace-backend/test/listingPublicRoutes.test.js
git commit -m "feat: add public listing APIs"
```

---

### Task 4: Multer và Cloudinary image lifecycle

**Files:**
- Create: `Marketplace-backend/src/config/cloudinary.js`
- Create: `Marketplace-backend/src/middleware/upload.js`
- Create: `Marketplace-backend/src/services/imageStorage.js`
- Create: `Marketplace-backend/test/imageStorage.test.js`
- Create: `Marketplace-backend/test/uploadMiddleware.test.js`
- Modify: `Marketplace-backend/.env.example`
- Modify: `Marketplace-backend/package.json`
- Modify: `Marketplace-backend/package-lock.json`
- Modify: `Marketplace-backend/src/routes/listings.js`
- Modify: `Marketplace-backend/src/server.js`

**Interfaces:**
- Consumes: image limits từ Task 1.
- Produces: `listingImagesUpload = multer(...).array('images', 5)`.
- Produces: `imageStorage.uploadImages(files) -> Promise<{url, publicId}[]>`.
- Produces: `imageStorage.deleteImages(publicIds) -> Promise<void>`.
- Produces: `handleUploadError(error, req, res, next)`.
- Mở rộng router factory thành `createListingRouter({ ListingModel = Listing, UserModel = User, authenticate = verifyToken, uploadMiddleware = listingImagesUpload, imageStore = imageStorage } = {})`.

- [ ] **Step 1: Cài dependencies và viết failing tests với fake Cloudinary**

```powershell
npm install cloudinary multer
```

Image service phải nhận Cloudinary client qua factory để test không gọi mạng:

```js
const uploaded = [];
const destroyed = [];
const fakeCloudinary = {
  uploader: {
    upload_stream: (_options, callback) => ({ end: buffer => {
      uploaded.push(buffer);
      callback(null, { secure_url: 'https://cdn.test/a.webp', public_id: 'marketplace/a' });
    }}),
    destroy: async publicId => { destroyed.push(publicId); },
  },
};

const store = createImageStorage(fakeCloudinary);
assert.deepEqual(await store.uploadImages([{ buffer: Buffer.from('image') }]), [
  { url: 'https://cdn.test/a.webp', publicId: 'marketplace/a' },
]);
await store.deleteImages(['marketplace/a']);
assert.deepEqual(destroyed, ['marketplace/a']);
```

Upload middleware tests phải xác nhận JPEG/PNG/WebP được nhận, GIF/PDF bị từ chối, file > 5 MB trả `400`, và > 5 files trả `400`. Image service tests phải có case upload thứ hai thất bại và xác nhận asset thứ nhất được cleanup.

- [ ] **Step 2: Chạy tests để xác nhận thất bại**

```powershell
node --test test/imageStorage.test.js test/uploadMiddleware.test.js
```

Expected: FAIL vì modules chưa tồn tại.

- [ ] **Step 3: Viết Cloudinary config, service và middleware**

`config/cloudinary.js` gọi `cloudinary.config` từ ba biến môi trường. `imageStorage` dùng folder `marketplace/listings`, `resource_type: 'image'` và upload tuần tự để có thể cleanup chính xác toàn bộ asset đã thành công nếu một file sau đó thất bại. `deleteImages` dùng `Promise.allSettled` và ném lỗi tổng hợp để caller log.

Thêm vào `.env.example`:

```env
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

`handleUploadError` map `LIMIT_FILE_SIZE`, `LIMIT_FILE_COUNT`, `LIMIT_UNEXPECTED_FILE` và file-type error sang `{ error }` status `400`.

Trong `server.js`, mount error middleware sau listing router:

```js
app.use('/api/listings', listingRoutes);
app.use(handleUploadError);
```

- [ ] **Step 4: Kết nối default dependencies vào router và chạy tests**

Thay no-op imports của Task 3 bằng `listingImagesUpload` và `imageStorage`, nhưng chưa thêm mutation routes.

```powershell
npm test
```

Expected: PASS, không gọi Cloudinary thật.

- [ ] **Step 5: Commit**

```powershell
git add Marketplace-backend/.env.example Marketplace-backend/package.json Marketplace-backend/package-lock.json Marketplace-backend/src/config/cloudinary.js Marketplace-backend/src/middleware/upload.js Marketplace-backend/src/services/imageStorage.js Marketplace-backend/src/routes/listings.js Marketplace-backend/src/server.js Marketplace-backend/test/imageStorage.test.js Marketplace-backend/test/uploadMiddleware.test.js
git commit -m "feat: add secure listing image uploads"
```

---

### Task 5: Authenticated listing creation

**Files:**
- Modify: `Marketplace-backend/src/routes/listings.js`
- Create: `Marketplace-backend/test/listingCreateRoute.test.js`

**Interfaces:**
- Consumes: `authenticate`, `UserModel`, `uploadMiddleware`, `imageStore`, `validateListingFields`.
- Produces: `POST /api/listings` multipart endpoint.

- [ ] **Step 1: Viết failing route tests**

Tạo fake auth đặt `req.user = { uid: 'firebase-a' }`, fake user `{ _id: 'mongo-a' }`, fake image store và fake `ListingModel.create`.

Tests phải xác nhận:

```js
assert.equal(response.status, 201);
assert.equal(createdPayload.seller, 'mongo-a');
assert.equal(createdPayload.sellerId, undefined);
assert.deepEqual(createdPayload.images, [{ url: 'https://cdn.test/a.webp', publicId: 'marketplace/a' }]);
```

Thêm cases: không auth `401`; user MongoDB không tồn tại `401`; thiếu title `400` trước upload; không ảnh `400`; payload gửi `sellerId=someone-else` vẫn dùng `mongo-a`; DB create lỗi phải gọi `deleteImages` với ảnh vừa upload.

- [ ] **Step 2: Chạy test để xác nhận thất bại**

```powershell
node --test test/listingCreateRoute.test.js
```

Expected: `404` hoặc method chưa tồn tại.

- [ ] **Step 3: Cài đặt POST route tối thiểu**

Thứ tự bắt buộc:

```text
authenticate -> uploadMiddleware -> validate fields/files -> resolve User by Firebase uid
-> upload images -> ListingModel.create with server-owned seller -> populate safe seller -> 201
```

Trong `catch`, nếu đã upload thì gọi `imageStore.deleteImages(newPublicIds)` trước khi trả lỗi. Không echo stack trace hoặc Cloudinary error ra client.

- [ ] **Step 4: Chạy create và full tests**

```powershell
node --test test/listingCreateRoute.test.js
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add Marketplace-backend/src/routes/listings.js Marketplace-backend/test/listingCreateRoute.test.js
git commit -m "feat: add authenticated listing creation"
```

---

### Task 6: Mine, update, delete và ownership security

**Files:**
- Modify: `Marketplace-backend/src/routes/listings.js`
- Create: `Marketplace-backend/test/listingOwnerRoutes.test.js`

**Interfaces:**
- Produces: `GET /api/listings/mine`, `PUT /api/listings/:id`, `DELETE /api/listings/:id`.
- Update multipart field: `retainedImagePublicIds` là JSON string array.

- [ ] **Step 1: Viết failing ownership tests**

Dùng hai fake users `mongo-a`, `mongo-b`. Test chính xác:

- `/mine` filter bằng `{ seller: mongo-a }`.
- User B update/delete listing của User A nhận `403` và không gọi upload/save/delete.
- malformed ID nhận `400`; ID hợp lệ nhưng không tồn tại nhận `404`.
- edit từ 2 retained + 1 new image lưu đúng 3 images.
- retained public ID không thuộc listing nhận `400`.
- edit còn 0 ảnh nhận `400`.
- save lỗi xóa ảnh mới nhưng giữ ảnh cũ.
- save thành công xóa ảnh cũ bị loại.
- delete thành công xóa DB trước, sau đó gọi cleanup tất cả public IDs.

Cross-user assertion:

```js
const response = await request(app)
  .put(`/api/listings/${listingId}`)
  .field('title', 'Tampered title');
assert.equal(response.status, 403);
assert.equal(saveCalled, false);
assert.equal(uploadCalled, false);
```

- [ ] **Step 2: Chạy test để xác nhận thất bại**

```powershell
node --test test/listingOwnerRoutes.test.js
```

Expected: routes chưa có hoặc assertions fail.

- [ ] **Step 3: Cài đặt ownership-first mutations**

Với update/delete, validate ObjectId, resolve authenticated MongoDB user, load listing, rồi so sánh:

```js
if (listing.seller.toString() !== currentUser._id.toString()) {
  return res.status(403).json({ error: 'You do not own this listing' });
}
```

Không upload trước bước so sánh ownership. Update chỉ nhận retained IDs đã tồn tại trong listing. Sau `save`, cleanup obsolete assets bằng best effort và `console.error` khi cleanup thất bại. Delete gọi `await listing.deleteOne()` rồi best-effort Cloudinary cleanup.

Khai báo `GET /mine` trước `GET /:id` trong router để chuỗi `mine` không bị xử lý như ObjectId.

- [ ] **Step 4: Chạy owner và full tests**

```powershell
node --test test/listingOwnerRoutes.test.js
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add Marketplace-backend/src/routes/listings.js Marketplace-backend/test/listingOwnerRoutes.test.js
git commit -m "feat: secure seller listing management"
```

---

### Task 7: Token refresh, frontend session và API client

**Files:**
- Modify: `Marketplace-backend/src/routes/auth.js`
- Create: `Marketplace-backend/test/authRefreshRoute.test.js`
- Create: `Marketplace-frontend/src/auth/session.js`
- Create: `Marketplace-frontend/src/api/client.js`
- Create: `Marketplace-frontend/test/session.test.js`
- Modify: `Marketplace-frontend/src/pages/Login.jsx`
- Modify: `Marketplace-frontend/package.json`

**Interfaces:**
- Produces backend `POST /auth/refresh` body `{ refreshToken }`, response `{ idToken, refreshToken, expiresIn }`.
- Produces `session.saveLogin(data)`, `session.hasSession()`, `session.getAccessToken()`, `session.clear()`.
- Produces `apiFetch(path, options)` và `ApiError`.

- [ ] **Step 1: Viết failing backend refresh test**

Tách helper `createAuthRouter({ firebaseAuth = auth, fetchImpl = fetch } = {})` và `export default createAuthRouter()` để giữ nguyên API mặc định, đồng thời test có thể truyền fake mà không gọi Firebase thật. Fake Firebase response dùng snake_case và endpoint phải normalize sang camelCase.

```js
assert.deepEqual(response.body, {
  idToken: 'new-id',
  refreshToken: 'new-refresh',
  expiresIn: '3600',
});
```

Thêm cases thiếu refresh token `400`, Firebase từ chối `401`, lỗi mạng `500`. Các route register/login/google/me hiện có vẫn phải được gắn trên router factory.

- [ ] **Step 2: Viết failing frontend session tests**

Trong frontend `package.json` thêm `"test": "node --test test/*.test.js"`. Dùng fake storage/fetch/clock qua `createSessionManager({ storage, fetchImpl, now })`:

```js
manager.saveLogin({ idToken: 'old', refreshToken: 'refresh', expiresIn: '3600' });
assert.equal(await manager.getAccessToken(), 'old');

clock.advance(3_601_000);
assert.equal(await manager.getAccessToken(), 'new-id');
assert.equal(storage.getItem('marketplace.auth') !== null, true);
```

Test refresh fail phải clear session và ném `AuthenticationError`.

- [ ] **Step 3: Chạy tests để xác nhận thất bại**

```powershell
Set-Location Marketplace-backend
node --test test/authRefreshRoute.test.js
Set-Location ..\Marketplace-frontend
npm test
```

Expected: FAIL vì interfaces chưa tồn tại.

- [ ] **Step 4: Cài đặt refresh/session/API client**

Backend POST tới `https://securetoken.googleapis.com/v1/token?key=${process.env.FIREBASE_API_KEY}` bằng body `application/x-www-form-urlencoded`; đặt `grant_type` thành `refresh_token` và `refresh_token` thành giá trị `refreshToken` nhận từ client. Không log hoặc trả refresh token lỗi từ Firebase nguyên văn.

Session key là `marketplace.auth`; lưu `expiresAt = now() + Number(expiresIn) * 1000`. Refresh sớm 30 giây. `apiFetch` dùng base URL `import.meta.env.VITE_API_URL || 'http://localhost:8000'`, serialize JSON trừ khi body là `FormData`, attach Bearer khi `auth: true`, parse `{ error }`, và ném `ApiError(status, message)`.

Trong `Login.jsx`, sau response thành công:

```js
session.saveLogin(data);
navigate('/');
```

Không thay đổi payload hoặc backend endpoint login hiện tại.

- [ ] **Step 5: Chạy backend/frontend tests**

```powershell
Set-Location Marketplace-backend
npm test
Set-Location ..\Marketplace-frontend
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add Marketplace-backend/src/routes/auth.js Marketplace-backend/test/authRefreshRoute.test.js Marketplace-frontend/package.json Marketplace-frontend/src/auth/session.js Marketplace-frontend/src/api/client.js Marketplace-frontend/src/pages/Login.jsx Marketplace-frontend/test/session.test.js
git commit -m "feat: persist authenticated marketplace sessions"
```

---

### Task 8: Marketplace browse UI, filters và pagination

**Files:**
- Create: `Marketplace-frontend/src/components/ListingCard.jsx`
- Create: `Marketplace-frontend/src/components/ListingGrid.jsx`
- Create: `Marketplace-frontend/src/components/ListingFilters.jsx`
- Create: `Marketplace-frontend/src/pages/Marketplace.jsx`
- Create: `Marketplace-frontend/src/css/listings.css`
- Modify: `Marketplace-frontend/src/main.jsx`

**Interfaces:**
- Consumes: `apiFetch('/api/listings?...')`.
- Produces: `/marketplace` route.
- `ListingCard({ listing, actions? })`; `ListingGrid({ listings, loading, error, emptyMessage, renderActions? })`.

- [ ] **Step 1: Tạo route/page tối thiểu và xác nhận build hiện tại thất bại nếu import thiếu**

Trước tiên cài đúng dependency frontend hiện có:

```powershell
npm install
```

Thêm route:

```jsx
<Route path="/marketplace" element={<Marketplace />} />
```

Run:

```powershell
npm run build
```

Expected: FAIL cho đến khi page/components được tạo.

- [ ] **Step 2: Cài đặt listing cards/grid states**

Card hiển thị ảnh đầu tiên, title, giá với `Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })`, category, condition, seller username và link `/listings/${listing._id}`. Ảnh có alt từ title và `loading="lazy"`.

Grid render chính xác một trong bốn trạng thái: loading, error có `role="alert"`, empty message, hoặc responsive card grid.

- [ ] **Step 3: Cài đặt filter/query URL flow**

`Marketplace` đọc/ghi `URLSearchParams` cho `search`, `category`, `condition`, `minPrice`, `maxPrice`, `sort`, `page`. Khi filter/search đổi, reset `page=1`. `useEffect` dùng `AbortController`; abort không hiển thị API error.

`ListingFilters` dùng select allowlists giống backend, input number `min=0`, và sort options đúng whitelist. Submit search bằng form, không dùng DOM global.

- [ ] **Step 4: Thêm pagination và responsive CSS**

Previous disabled khi page 1; Next disabled khi page >= pages. Card grid dùng `repeat(auto-fit, minmax(240px, 1fr))`; breakpoint 768 px xếp filter theo cột; breakpoint 480 px giảm padding/font nhưng không gây horizontal overflow.

- [ ] **Step 5: Lint/build và manual state check**

```powershell
npm run lint
npm run build
```

Expected: PASS. Kiểm tra thủ công loading, empty, API error, 1 card và nhiều card ở 375/768/1280 px.

- [ ] **Step 6: Commit**

```powershell
git add Marketplace-frontend/src/main.jsx Marketplace-frontend/src/components/ListingCard.jsx Marketplace-frontend/src/components/ListingGrid.jsx Marketplace-frontend/src/components/ListingFilters.jsx Marketplace-frontend/src/pages/Marketplace.jsx Marketplace-frontend/src/css/listings.css
git commit -m "feat: add marketplace browsing interface"
```

---

### Task 9: Listing detail và image gallery

**Files:**
- Create: `Marketplace-frontend/src/pages/ListingDetail.jsx`
- Modify: `Marketplace-frontend/src/main.jsx`
- Modify: `Marketplace-frontend/src/css/listings.css`

**Interfaces:**
- Consumes: `GET /api/listings/:id`.
- Produces: `/listings/:id` route.

- [ ] **Step 1: Đăng ký route và tạo detail page loading/error shell**

```jsx
<Route path="/listings/:id" element={<ListingDetail />} />
```

Page dùng `useParams`, `AbortController`, và phân biệt `404` với API error chung.

- [ ] **Step 2: Cài gallery và dữ liệu**

State `selectedImage` mặc định ảnh đầu tiên. Thumbnail là `<button>` có `aria-label={\`View image ${index + 1}\`}`; main image alt chứa title. Hiển thị title, AUD price, description, category, condition, `seller.username`, và ngày `en-AU`.

Hiển thị nút disabled `Contact Seller — messaging coming later`; không tạo route/messages, request hoặc transaction.

- [ ] **Step 3: Lint/build và manual route checks**

```powershell
npm run lint
npm run build
```

Expected: PASS. Kiểm tra ID hợp lệ, 404, malformed ID, một ảnh và năm ảnh.

- [ ] **Step 4: Commit**

```powershell
git add Marketplace-frontend/src/main.jsx Marketplace-frontend/src/pages/ListingDetail.jsx Marketplace-frontend/src/css/listings.css
git commit -m "feat: add listing detail gallery"
```

---

### Task 10: Protected routes, ImageUploader và shared ListingForm

**Files:**
- Create: `Marketplace-frontend/src/components/RequireAuth.jsx`
- Create: `Marketplace-frontend/src/components/ImageUploader.jsx`
- Create: `Marketplace-frontend/src/components/ListingForm.jsx`
- Create: `Marketplace-frontend/src/pages/CreateListing.jsx`
- Modify: `Marketplace-frontend/src/main.jsx`
- Modify: `Marketplace-frontend/src/css/listings.css`

**Interfaces:**
- `RequireAuth({ children })` redirect tới `/login` nếu không có session.
- `ImageUploader({ retainedImages, newFiles, onRetainedChange, onFilesChange, error })`.
- `ListingForm({ initialValues, retainedImages, submitLabel, onSubmit })`.
- Produces: `/sell` route.

- [ ] **Step 1: Tạo protected route và build-fail checkpoint**

```jsx
<Route path="/sell" element={<RequireAuth><CreateListing /></RequireAuth>} />
```

```powershell
npm run build
```

Expected: FAIL cho đến khi imports tồn tại.

- [ ] **Step 2: Cài ImageUploader validation/preview**

Client chỉ nhận MIME `image/jpeg`, `image/png`, `image/webp`; từ chối > 5 MB; tổng retained + new <= 5. Dùng `URL.createObjectURL` cho preview mới và cleanup bằng `URL.revokeObjectURL`. Mỗi ảnh có nút Remove với accessible label.

- [ ] **Step 3: Cài shared form**

Form là controlled component cho title, description, price, category, condition và images. Submit dùng `<form onSubmit>`, button disabled khi `submitting`, error có `role="alert"`. HTML constraints khớp backend nhưng không thay thế backend validation.

- [ ] **Step 4: Cài create multipart flow**

```js
const body = new FormData();
body.set('title', values.title);
body.set('description', values.description);
body.set('price', values.price);
body.set('category', values.category);
body.set('condition', values.condition);
newFiles.forEach(file => body.append('images', file));
const listing = await apiFetch('/api/listings', { method: 'POST', body, auth: true });
navigate(`/listings/${listing._id}`, { state: { message: 'Listing created successfully' } });
```

Không set `Content-Type` thủ công cho FormData. Không append seller ID.

- [ ] **Step 5: Lint/build và manual validation**

```powershell
npm run lint
npm run build
```

Expected: PASS. Kiểm tra unauth redirect, invalid MIME, >5 MB, >5 images, missing title, invalid price, repeated submit và API error.

- [ ] **Step 6: Commit**

```powershell
git add Marketplace-frontend/src/main.jsx Marketplace-frontend/src/components/RequireAuth.jsx Marketplace-frontend/src/components/ImageUploader.jsx Marketplace-frontend/src/components/ListingForm.jsx Marketplace-frontend/src/pages/CreateListing.jsx Marketplace-frontend/src/css/listings.css
git commit -m "feat: add seller listing form"
```

---

### Task 11: My listings, edit và delete UX

**Files:**
- Create: `Marketplace-frontend/src/pages/MyListings.jsx`
- Create: `Marketplace-frontend/src/pages/EditListing.jsx`
- Modify: `Marketplace-frontend/src/main.jsx`
- Modify: `Marketplace-frontend/src/components/ListingCard.jsx`
- Modify: `Marketplace-frontend/src/css/listings.css`

**Interfaces:**
- Consumes: protected mine/update/delete endpoints.
- Produces: `/my-listings`, `/listings/:id/edit`.

- [ ] **Step 1: Đăng ký protected routes**

```jsx
<Route path="/my-listings" element={<RequireAuth><MyListings /></RequireAuth>} />
<Route path="/listings/:id/edit" element={<RequireAuth><EditListing /></RequireAuth>} />
```

- [ ] **Step 2: Cài MyListings và action slots**

Fetch `/api/listings/mine` với `auth: true`. Reuse `ListingGrid`; action slot của card có Edit link và Delete button. Empty copy: `You have not created any listings yet.` với link `/sell`.

- [ ] **Step 3: Cài delete confirmation**

`window.confirm('Delete this listing? This action cannot be undone.')` trước request. Cancel không gọi API. Success remove card khỏi local state và show status message. `403`, `404`, network error giữ card và hiển thị error.

- [ ] **Step 4: Cài edit flow**

Load detail, điền `initialValues` và retained images. Khi submit:

```js
body.set('retainedImagePublicIds', JSON.stringify(retainedImages.map(image => image.publicId)));
newFiles.forEach(file => body.append('images', file));
await apiFetch(`/api/listings/${id}`, { method: 'PUT', body, auth: true });
```

Backend quyết định ownership. Nếu nhận `403`, page hiển thị `You do not own this listing` và không render form tiếp tục chỉnh sửa.

- [ ] **Step 5: Lint/build và manual seller flow**

```powershell
npm run lint
npm run build
```

Kiểm tra create -> mine -> edit fields/images -> save -> delete cancel -> delete confirm. Expected: PASS và UI state đúng.

- [ ] **Step 6: Commit**

```powershell
git add Marketplace-frontend/src/main.jsx Marketplace-frontend/src/components/ListingCard.jsx Marketplace-frontend/src/pages/MyListings.jsx Marketplace-frontend/src/pages/EditListing.jsx Marketplace-frontend/src/css/listings.css
git commit -m "feat: add seller listing management UI"
```

---

### Task 12: Kết nối header search/navigation và responsive polish

**Files:**
- Modify: `Marketplace-frontend/index.html`
- Modify: `Marketplace-frontend/src/js/script.js`
- Modify: `Marketplace-frontend/src/css/index.css`
- Modify: `Marketplace-frontend/src/css/listings.css`

**Interfaces:**
- Header search tạo URL `/marketplace?search=` cộng với kết quả `encodeURIComponent(query)`.
- Sidebar Sell links `/sell`; thêm My Listings link `/my-listings`; Home/Marketplace navigation rõ ràng.

- [ ] **Step 1: Sửa search URL và navigation**

`handleSearch` phải dùng:

```js
window.location.href = '/marketplace?search=' + encodeURIComponent(query);
```

Xóa alert/debug search và URL cũ `/search?=`. Đổi static `Sell` thành anchor `/sell`, thêm `/marketplace` và `/my-listings`. Không kích hoạt Messages, cart hoặc Purchase History.

- [ ] **Step 2: Responsive/accessibility cleanup trong phạm vi file chạm tới**

Thêm label ẩn cho search, `type="button"` cho icon buttons nếu chuyển thành button, visible `:focus-visible`, grid không tràn ở 375 px. Không redesign header/footer hoặc thay font/màu thương hiệu.

- [ ] **Step 3: Lint/build và responsive check**

```powershell
npm run lint
npm run build
```

Kiểm tra keyboard focus, Enter search, sidebar links và các viewport 375/768/1280 px.

- [ ] **Step 4: Commit**

```powershell
git add Marketplace-frontend/index.html Marketplace-frontend/src/js/script.js Marketplace-frontend/src/css/index.css Marketplace-frontend/src/css/listings.css
git commit -m "feat: connect marketplace navigation"
```

---

### Task 13: Security regression và Definition of Done verification

**Files:**
- Modify only if a verification failure requires a focused fix.
- Record commands/results in the final implementation handoff; do not create a generated report unless requested.

**Interfaces:**
- Verifies all interfaces from Tasks 1–12.

- [ ] **Step 1: Chạy backend tests**

```powershell
Set-Location Marketplace-backend
npm test
```

Expected: tất cả validation/model/public/create/owner/upload/auth-refresh tests PASS.

- [ ] **Step 2: Chạy frontend tests, lint và build**

```powershell
Set-Location ..\Marketplace-frontend
npm test
npm run lint
npm run build
```

Expected: tất cả PASS, không warning mới do listing code.

- [ ] **Step 3: Chạy manual seller và buyer flows với cấu hình thật**

Seller A:

```text
Login -> create 1–5 images -> marketplace -> detail -> my listings
-> edit text/retain/remove/add image -> save -> cancel delete -> confirm delete
```

Buyer:

```text
Open public marketplace -> title search -> category/condition/min/max filters
-> four sorts -> pagination -> detail gallery
```

Expected: dữ liệu/ảnh đồng bộ và state loading/empty/error rõ ràng.

- [ ] **Step 4: Chạy security matrix bằng hai tài khoản**

User B lấy listing ID của User A rồi gọi trực tiếp PUT và DELETE với Bearer token của B. Expected cả hai `403`; listing và Cloudinary images của A không đổi. Gọi POST không token expected `401`. Thử missing title, price `0`, GIF/PDF, >5 MB, >5 files, malformed ID và nonexistent ObjectId; expected controlled `400`/`404` theo spec.

- [ ] **Step 5: Regression auth**

Đăng ký một tài khoản mới, đăng nhập, gọi `/auth/me`, refresh token qua `/auth/refresh`, reload trang trong cùng browser session và tạo listing. Expected register/login hiện có vẫn hoạt động; session đóng thì seller route yêu cầu login lại.

- [ ] **Step 6: Kiểm tra repository và commit fix cuối nếu có**

```powershell
git diff --check
git status --short
```

Nếu verification tạo fix, chạy lại toàn bộ checks bị ảnh hưởng, stage từng đường dẫn chính xác thuộc fix (không stage file ngoài phạm vi), rồi commit với message `fix: resolve marketplace verification issues`. Nếu không có fix thì không tạo commit rỗng.

Expected: không có secret, `.env`, `credentials.json`, build output hoặc thay đổi ngoài phạm vi.
