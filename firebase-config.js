// Importamos las funciones necesarias usando las rutas CDN (Vital para HTML nativo)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Tu configuración web de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCtTci6St-fxLLaADpVh4Sp9aguQg6JWrg",
  authDomain: "sgc-feveco-app.firebaseapp.com",
  projectId: "sgc-feveco-app",
  storageBucket: "sgc-feveco-app.firebasestorage.app",
  messagingSenderId: "377995413781",
  appId: "1:377995413781:web:62d8f52533b216717bc11c"
};

// Inicializamos la Aplicación
const app = initializeApp(firebaseConfig);

// Inicializamos Cloud Firestore y lo exportamos para usarlo en script.js
export const db = getFirestore(app);