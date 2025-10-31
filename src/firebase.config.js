import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBe8T2atS2Ke5RINSWRqQpWR6Ke8nEQK3s",
  authDomain: "motherlandjams-e82ea.firebaseapp.com",
  databaseURL: "https://motherlandjams-e82ea-default-rtdb.firebaseio.com",
  projectId: "motherlandjams-e82ea",
  storageBucket: "motherlandjams-e82ea.firebasestorage.app",
  messagingSenderId: "935504820183",
  appId: "1:935504820183:web:c6a91a47568eb93981fd92",
  measurementId: "G-4VLLWZGNVH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

// Enable auth persistence
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Firebase auth persistence enabled');
  })
  .catch((error) => {
    console.error('❌ Error enabling auth persistence:', error);
  });

export default app;

