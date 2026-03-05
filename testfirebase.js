// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAQAahJCMjCoRymgkHD2_ZaqSAhzs4OQXs",
  authDomain: "midhd-d1b6e.firebaseapp.com",
  projectId: "midhd-d1b6e",
  storageBucket: "midhd-d1b6e.firebasestorage.app",
  messagingSenderId: "1077714994120",
  appId: "1:1077714994120:web:b7e8aefe35778e30da76fd",
  measurementId: "G-PLQXWXPP9N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log("Firebase app initialized:", app.name);

// Analytics only works in browser (uses window/cookies)
if (typeof window !== "undefined") {
  const analytics = getAnalytics(app);
  console.log("Firebase Analytics initialized");
} else {
  console.log("Skipping Analytics (Node.js environment)");
}