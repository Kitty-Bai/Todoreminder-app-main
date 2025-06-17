// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCf9bM4HsDTdCou6ul5I4e09NuzrQj8W80",
  authDomain: "todoreminder-7f12d.firebaseapp.com",
  projectId: "todoreminder-7f12d",
  storageBucket: "todoreminder-7f12d.appspot.com",
  messagingSenderId: "92365934965",
  appId: "1:92365934965:web:09377b069e6ead58ab433c"
};

let app;
let auth;
let db;

const initializeFirebase = async () => {
  try {
    // Initialize Firebase only if it hasn't been initialized
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    console.log('Firebase app initialized successfully');

    // Initialize Auth with AsyncStorage persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log('Firebase Auth initialized successfully');

    // Initialize Firestore
    db = getFirestore(app);
    
    // Configure Firestore settings
    const settings = {
      cacheSizeBytes: 50 * 1024 * 1024, // 50 MB
      experimentalForceLongPolling: true, // Use long polling instead of WebSocket
      experimentalAutoDetectLongPolling: true,
    };
    
    // Enable offline persistence with retry
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await enableIndexedDbPersistence(db);
        console.log('Firestore offline persistence enabled');
        break;
      } catch (err) {
        retryCount++;
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
          break;
        } else if (err.code === 'unimplemented') {
          console.warn('The current browser does not support persistence.');
          break;
        } else {
          console.error(`Error enabling Firestore persistence (attempt ${retryCount}/${maxRetries}):`, err);
          if (retryCount === maxRetries) {
            throw err;
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }

    // Log configuration for debugging
    console.log('Firebase initialized with config:', {
      projectId: firebaseConfig.projectId,
      authDomain: firebaseConfig.authDomain,
      storageBucket: firebaseConfig.storageBucket
    });

    return { app, auth, db };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    throw error;
  }
};

// Initialize Firebase immediately
initializeFirebase().catch(error => {
  console.error('Failed to initialize Firebase:', error);
});

export { auth, db };
export default app; 