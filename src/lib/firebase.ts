import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBHqmi3cQyXsdM1pXO6bJ7mEtCo_iCy3_I",
  authDomain: "api-game-sroff-crack.firebaseapp.com",
  projectId: "api-game-sroff-crack",
  storageBucket: "api-game-sroff-crack.firebasestorage.app",
  messagingSenderId: "1023985851778",
  appId: "1:1023985851778:web:1ff6bbb75ac8f9400e439b",
  measurementId: "G-T8ERWVQTEM"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };
