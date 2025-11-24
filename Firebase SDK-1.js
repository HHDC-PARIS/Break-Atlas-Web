// npm install firebase

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBeet8eefoHisNGuHheICPm0HfJpGCjY60",
  authDomain: "break-atlas.firebaseapp.com",
  projectId: "break-atlas",
  storageBucket: "break-atlas.firebasestorage.app",
  messagingSenderId: "247742707248",
  appId: "1:247742707248:web:a1a734e465aa95e7dedff5",
  measurementId: "G-EHPL03SR5T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// npm install -g firebase-tools

// firebase login

// firebase init

// firebase deploy