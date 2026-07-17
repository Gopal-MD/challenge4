/**
 * Firebase initialization for FanOps Unified.
 *
 * Set these variables in a `.env` file at the project root:
 *   VITE_FIREBASE_API_KEY=...
 *   VITE_FIREBASE_AUTH_DOMAIN=...
 *   VITE_FIREBASE_PROJECT_ID=...
 *   VITE_FIREBASE_STORAGE_BUCKET=...
 *   VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *   VITE_FIREBASE_APP_ID=...
 *   VITE_FIREBASE_DATABASE_URL=...  (for Realtime DB)
 *
 * If any env var is absent, this module exports `null` stubs and logs a warning.
 * The rest of the app will degrade gracefully.
 */

let _auth: unknown = null;
let _db: unknown = null;
let _rtdb: unknown = null;
let _storage: unknown = null;

const env = typeof import.meta !== "undefined" ? (import.meta as any).env ?? {} : {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
};

const isConfigured = Object.values(firebaseConfig).every(Boolean);

if (!isConfigured) {
  console.warn(
    "[Firebase] Missing env vars — Firebase features are disabled.\n" +
    "Add VITE_FIREBASE_* variables to your .env file to enable."
  );
} else {
  // Dynamically import Firebase only when configured to avoid
  // bundling the entire Firebase SDK when not needed.
  (async () => {
    try {
      const { initializeApp } = await import("firebase/app");
      const { getAuth, setPersistence, browserLocalPersistence } = await import("firebase/auth");
      const { getFirestore, enableIndexedDbPersistence } = await import("firebase/firestore");
      const { getDatabase } = await import("firebase/database");
      const { getStorage } = await import("firebase/storage");

      const app = initializeApp(firebaseConfig);

      _auth = getAuth(app);
      await setPersistence(_auth as ReturnType<typeof getAuth>, browserLocalPersistence);

      _db = getFirestore(app);
      try {
        await enableIndexedDbPersistence(_db as ReturnType<typeof getFirestore>);
      } catch (err: unknown) {
        if ((err as { code?: string })?.code !== "failed-precondition") {
          console.warn("[Firebase] IndexedDB persistence not available:", err);
        }
      }

      _rtdb = getDatabase(app);
      _storage = getStorage(app);

      console.log("[Firebase] Initialized successfully.");
    } catch (err) {
      console.error("[Firebase] Initialization failed:", err);
    }
  })();
}

/** Firebase Auth instance (null if not configured) */
export const getFirebaseAuth = () => _auth;
/** Firestore instance (null if not configured) */
export const getFirestore_ = () => _db;
/** Realtime Database instance (null if not configured) */
export const getRealtimeDB = () => _rtdb;
/** Firebase Storage instance (null if not configured) */
export const getFirebaseStorage = () => _storage;

export const isFirebaseReady = () => isConfigured;
