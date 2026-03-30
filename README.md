# 3851A — DP2 Marketplace
COMP3851A – Computing and Information Sciences WIL

A full-stack marketplace web application with user authentication built using React, Node.js, Firebase, and MongoDB.

---


---

## Tech Stack

**Frontend**
- React 19
- React Router v7
- Firebase Client SDK

**Backend**
- Node.js + Express 5
- Firebase Admin SDK (authentication & token verification)
- MongoDB + Mongoose

---

## Project Structure

```
DP2-Marketplace/
├── Marketplace-backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── config/
│   │   │   ├── firebase.js
│   │   │   └── mongodb.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── models/
│   │   │   └── User.js
│   │   └── routes/
│   │       └── auth.js
│   ├── .env.example
│   └── package.json
└── Marketplace-frontend/
    ├── src/
    │   ├── App.js
    │   ├── pages/
    │   │   ├── HomePage.js
    │   │   ├── LoginPage.js
    │   │   └── CreateAccountPages.js
    │   └── hooks/
    │       └── useUser.js
    └── package.json
```

---

## Getting Started

### Prerequisites
- Node.js
- MongoDB Atlas account
- Firebase project

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd Marketplace-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```
   MONGODB_URI=your_mongodb_connection_string
   FIREBASE_API_KEY=your_firebase_api_key
   ```

4. Add your Firebase service account key as `credentials.json` in the backend root.

5. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd Marketplace-frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the app:
   ```bash
   npm start
   ```
   The app runs on [http://localhost:3000](http://localhost:3000)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register with email & password |
| POST | `/auth/login` | Login with email & password |
| POST | `/auth/google` | Login with Google OAuth |
| GET | `/auth/me` | Get current user (requires token) |

---

## Environment Variables

Create a `.env` file in `Marketplace-backend/` using `.env.example` as a template:

```
MONGODB_URI=        # MongoDB Atlas connection string
FIREBASE_API_KEY=   # Firebase Web API key
```

> Never commit your `.env` or `credentials.json` to version control.
