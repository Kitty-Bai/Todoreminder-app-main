// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_Xi-B8CqM_WW2D2j0gmz-PND49ciOhyY",
  authDomain: "todoreminderapp-8c615.firebaseapp.com",
  projectId: "todoreminderapp-8c615",
  storageBucket: "todoreminderapp-8c615.firebasestorage.app",
  messagingSenderId: "650319432555",
  appId: "1:650319432555:web:2c60a02d4796fe84205a2e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Log configuration for debugging
console.log('Firebase initialized with project:', firebaseConfig.projectId);
console.log('✅ Firebase Firestore initialized (Auth disabled for Expo Go compatibility)');

export default app; 