import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCaVRqYBkK2VPevu7HnVc-UdkmqTQ3WRBs",
  authDomain: "challenge-4-7a8f2.firebaseapp.com",
  projectId: "challenge-4-7a8f2",
  storageBucket: "challenge-4-7a8f2.firebasestorage.app",
  messagingSenderId: "718223701993",
  appId: "1:718223701993:web:fd5ad10bd747f05dbf7d78",
  measurementId: "G-LB9ZWV6QZ1"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
