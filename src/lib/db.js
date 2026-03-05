import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

/**
 * Converts a Firestore document snapshot to a plain object with `id`.
 */
const docToObject = (docSnap) => {
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  const converted = { id: docSnap.id };
  for (const [key, value] of Object.entries(data)) {
    converted[key] = value instanceof Timestamp ? value.toDate().toISOString() : value;
  }
  return converted;
};

/**
 * Returns a Firestore-backed entity API that mirrors the existing
 * localEntityApi / entityApi interface used throughout the app.
 */
export const firestoreEntityApi = (entityName) => {
  if (!isFirebaseConfigured || !db) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* env vars.');
  }

  const col = collection(db, entityName);

  return {
    list: async (sort = '-created_date', limit = 100) => {
      const sortKey = String(sort || '-created_date');
      const isDesc = sortKey.startsWith('-');
      const field = isDesc ? sortKey.slice(1) : sortKey;

      const q = query(
        col,
        orderBy(field, isDesc ? 'desc' : 'asc'),
        firestoreLimit(Number(limit) || 100)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToObject);
    },

    filter: async (criteria = {}, sort = '-created_date', limit = 100) => {
      const sortKey = String(sort || '-created_date');
      const isDesc = sortKey.startsWith('-');
      const field = isDesc ? sortKey.slice(1) : sortKey;

      const constraints = Object.entries(criteria || {}).map(
        ([key, value]) => where(key, '==', value)
      );

      const q = query(
        col,
        ...constraints,
        orderBy(field, isDesc ? 'desc' : 'asc'),
        firestoreLimit(Number(limit) || 100)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToObject);
    },

    create: async (data) => {
      const now = new Date().toISOString();
      const payload = {
        ...data,
        created_date: now,
        updated_date: now,
      };
      const docRef = await addDoc(col, payload);
      return { id: docRef.id, ...payload };
    },

    update: async (id, data) => {
      const docRef = doc(db, entityName, id);
      const updatePayload = {
        ...data,
        updated_date: new Date().toISOString(),
      };
      await updateDoc(docRef, updatePayload);
      const updated = await getDoc(docRef);
      return docToObject(updated);
    },

    delete: async (id) => {
      const docRef = doc(db, entityName, id);
      await deleteDoc(docRef);
      return { success: true };
    },
  };
};
