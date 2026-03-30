import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
    readFileSync(new URL('../../credentials.json', import.meta.url))
);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

export const auth = admin.auth();
export default admin;
