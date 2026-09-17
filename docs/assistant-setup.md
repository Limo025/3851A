# Marketplace assistant setup

The marketplace assistant calls Gemini from the backend. Production deployments must use a paid Gemini API tier so assistant requests receive the privacy and data-handling terms for paid services. Confirm the current Gemini terms for the selected account and region before deployment.

## Configuration

Copy `Marketplace-backend/.env.example` to `Marketplace-backend/.env`, then set:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
```

`GEMINI_API_KEY` is a server secret. Keep it only in the backend environment; never add it to frontend source, a `VITE_` variable, browser storage, logs, or version control.

`GEMINI_MODEL` selects the Gemini model and can be overridden without changing application code. If it is omitted, the backend uses `gemini-2.5-flash-lite`.

Complete the other backend values documented in `.env.example`, including MongoDB, Firebase, and Cloudinary configuration.

## Local startup

From `Marketplace-backend`, install dependencies and start the API:

```sh
npm install
npm run dev
```

In a second terminal, start the client from `Marketplace-frontend`:

```sh
npm install
npm run dev
```

The client uses `http://localhost:8000` by default. Set its existing `VITE_API_URL` configuration when the backend is hosted elsewhere; this variable is only the API base URL and must not contain the Gemini key.

## Privacy and access boundaries

- Conversations and assistant drafts are held in memory only. This app does not persist them in MongoDB, browser storage, or another conversation store, and a full page reload clears them.
- Buying assistance is public and does not require login. Search results expose only the public listing fields returned by the assistant search boundary.
- Selling drafts require login. An anonymous user who starts the selling flow is sent through login, while the in-memory chat remains available during that SPA navigation. The assistant never submits a listing; the user reviews the prefilled `/sell` form, adds any image, and performs the final submission.
- The Gemini key remains backend-only. The browser sends assistant requests to the marketplace backend, which makes the provider request.
