// Put the components/service/firebaseService.tsx code here // firebaseService.ts
import { initializeApp } from "firebase/app";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  DocumentData,
} from "firebase/firestore";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";


// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCiDB7JtWbVAyQeYLqB26bRkhwrbdqNltI",
  authDomain: "dwva2-efed3.firebaseapp.com",
  projectId: "dwva2-efed3",
  storageBucket: "dwva2-efed3.firebasestorage.app",
  messagingSenderId: "679551558745",
  appId: "1:679551558745:web:ff2b9e6f5e2e97962c7d48",
  measurementId: "G-VV9HZT7PQQ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

// Utility: normalize tab name (e.g. remove spaces and lowercase)
const normalizeTab = (tab: string) => tab.replace(/\s/g, "").toLowerCase();

// --- Dropped Images functions ---
export async function loadDroppedImages(tab: string): Promise<DocumentData> {
  const docRef = doc(db, "droppedImages", normalizeTab(tab));
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    // Return default structure if no data exists
    return { fbig: {}, tiktok: {} };
  }
}

export async function saveDroppedImages(
  tab: string,
  images: { fbig: { [key: string]: string }; tiktok: { [key: string]: string } }
): Promise<void> {
  const docRef = doc(db, "droppedImages", normalizeTab(tab));
  // Use merge:true so that only fields you pass are updated
  await setDoc(docRef, images, { merge: true });
}

// --- Image Metadata functions ---
export async function loadImageMetadata(tab: string): Promise<DocumentData> {
  const docRef = doc(db, "imageMetadata", normalizeTab(tab));
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    return {}; // caller can fallback to defaults
  }
}

export async function saveImageMetadata(
  tab: string,
  metadata: {
    fbig: { [key: string]: any };
    tiktok: { [key: string]: any };
  }
): Promise<void> {
  const docRef = doc(db, "imageMetadata", normalizeTab(tab));
  await setDoc(docRef, metadata, { merge: true });
}
