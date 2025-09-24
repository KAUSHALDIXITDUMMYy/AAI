import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyCSPl7r--KFIuzBD7EJJ3UwshJKZLk2_34",
  authDomain: "zoom-bot-a7d54.firebaseapp.com",
  projectId: "zoom-bot-a7d54",
  storageBucket: "zoom-bot-a7d54.firebasestorage.app",
  messagingSenderId: "564239089518",
  appId: "1:564239089518:web:81a9003d0b063a6cd9cb7f",
  measurementId: "G-RLJ4HY3CJH",
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export default app
