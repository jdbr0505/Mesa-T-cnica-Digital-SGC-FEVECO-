import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtTci6St-fxLLaADpVh4Sp9aguQg6JWrg",
  authDomain: "sgc-feveco-app.firebaseapp.com",
  projectId: "sgc-feveco-app",
  storageBucket: "sgc-feveco-app.firebasestorage.app",
  messagingSenderId: "377995413781",
  appId: "1:377995413781:web:62d8f52533b216717bc11c"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
