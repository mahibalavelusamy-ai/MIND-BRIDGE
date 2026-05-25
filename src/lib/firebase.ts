import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, getRedirectResult, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  orderBy,
  limit,
  increment,
  writeBatch,
  clearIndexedDbPersistence,
  arrayUnion
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { experimentalForceLongPolling: true, useFetchStreams: false } as any, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  // Dispatch custom event for global error handling (e.g., to show a toast)
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('firestore-error', { detail: errInfo });
    window.dispatchEvent(event);
  }
  
  throw new Error(JSON.stringify(errInfo));
}

// Auth Helpers
export const loginWithGoogle = async () => {
  return await signInWithPopup(auth, googleProvider);
};

export const clearAppPersistence = async () => {
  try {
    await clearIndexedDbPersistence(db);
  } catch (error) {
    console.error("Failed to clear persistence", error);
  }
};

export const handleGoogleRedirectResult = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error) {
    console.error("Redirect result error:", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

// Firestore Helpers
export { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp,
  orderBy,
  limit,
  increment,
  writeBatch,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  arrayUnion
};
export type { User };
