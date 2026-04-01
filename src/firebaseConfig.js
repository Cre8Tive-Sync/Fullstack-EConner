// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCsaq2dFkneaFD5FMFkWJEWtverW_5W_m4",
  authDomain: "econner-ar.firebaseapp.com",
  projectId: "econner-ar",
  storageBucket: "econner-ar.firebasestorage.app",
  messagingSenderId: "505745008931",
  appId: "1:505745008931:web:ae361c03b382f3cf984496",
  measurementId: "G-YS1HGB66R7"
};


const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, db, storage, firebaseConfig };
