import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAZJvLlt05-fQK9ix4A_4qjY_y79mDfaNU",
  authDomain: "law-office-78a96.firebaseapp.com",
  projectId: "law-office-78a96",
  storageBucket: "law-office-78a96.firebasestorage.app",
  messagingSenderId: "789453843979",
  appId: "1:789453843979:web:d2558096ca8e84e041e10e",
};

export const app = initializeApp(firebaseConfig);

export default app;