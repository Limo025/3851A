import { auth } from '../config/firebase.js';

// This file exists bcs socket cant send http headers so there would be no token so user wont be able to authenticate themselves
export async function verifyFirebaseToken(idToken) {
  if (!idToken) return null;
  try {
    return await auth.verifyIdToken(idToken);
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return null;
  }
}