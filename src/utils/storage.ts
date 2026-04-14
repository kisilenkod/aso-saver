import { db } from '../firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp, arrayUnion, arrayRemove,
  type Unsubscribe
} from 'firebase/firestore';
import { AppEntry } from '../types';

const APPS_COLLECTION = 'apps';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Subscribe to apps where user is a member
export function subscribeToApps(
  userId: string,
  callback: (apps: AppEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, APPS_COLLECTION),
    where('memberIds', 'array-contains', userId)
  );
  return onSnapshot(q, (snapshot) => {
    const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppEntry));
    apps.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    callback(apps);
  });
}

export async function getApp(id: string): Promise<AppEntry | null> {
  const snap = await getDoc(doc(db, APPS_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as AppEntry;
}

export async function createApp(userId: string, userEmail: string, userName: string, userPhoto: string): Promise<AppEntry> {
  const appId = generateId();
  const versionId = generateId();
  const newApp: any = {
    name: 'New App',
    bundleId: '',
    icon: '',
    appStoreUrl: '',
    versions: [{
      id: versionId,
      version: '1.0',
      localizations: [
        { language: 'en-US', title: '', subtitle: '', keywords: '', description: '', screenshots: [] }
      ],
      createdAt: Date.now(),
    }],
    activeVersionId: versionId,
    ownerId: userId,
    memberIds: [userId],
    members: {
      [userId]: {
        email: userEmail,
        displayName: userName,
        photoURL: userPhoto,
        role: 'owner',
      }
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await setDoc(doc(db, APPS_COLLECTION, appId), newApp);
  return { id: appId, ...newApp } as AppEntry;
}

export async function saveApp(app: AppEntry): Promise<void> {
  const { id, ...data } = app;
  await updateDoc(doc(db, APPS_COLLECTION, id), { ...data, updatedAt: Date.now() });
}

export async function deleteApp(id: string): Promise<void> {
  await deleteDoc(doc(db, APPS_COLLECTION, id));
}

// Sharing
export async function addMember(
  appId: string,
  userId: string,
  email: string,
  displayName: string,
  photoURL: string,
  role: 'editor' | 'viewer'
): Promise<void> {
  const appRef = doc(db, APPS_COLLECTION, appId);
  await updateDoc(appRef, {
    memberIds: arrayUnion(userId),
    [`members.${userId}`]: { email, displayName, photoURL, role },
  });
}

export async function updateMemberRole(
  appId: string,
  userId: string,
  role: 'editor' | 'viewer'
): Promise<void> {
  const appRef = doc(db, APPS_COLLECTION, appId);
  await updateDoc(appRef, {
    [`members.${userId}.role`]: role,
  });
}

export async function removeMember(appId: string, userId: string): Promise<void> {
  const appRef = doc(db, APPS_COLLECTION, appId);
  const snap = await getDoc(appRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const members = { ...data.members };
  delete members[userId];
  await updateDoc(appRef, {
    memberIds: arrayRemove(userId),
    members,
  });
}

// Find user by email across all apps (for invite by email)
// We'll use a users collection for email lookup
export async function findUserByEmail(email: string): Promise<{ uid: string; email: string; displayName: string; photoURL: string } | null> {
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const userData = snap.docs[0];
  return { uid: userData.id, ...userData.data() } as any;
}

export async function saveUserProfile(uid: string, email: string, displayName: string, photoURL: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), { email, displayName, photoURL }, { merge: true });
}

// Export/Import
export function exportApps(apps: AppEntry[]): string {
  const exportData = apps.map(({ memberIds, members, ownerId, ...rest }) => rest);
  return JSON.stringify({ apps: exportData, version: 2 }, null, 2);
}

export async function importApps(json: string, userId: string, userEmail: string, userName: string, userPhoto: string): Promise<void> {
  const data = JSON.parse(json);
  if (!data.apps || !Array.isArray(data.apps)) throw new Error('Invalid format');

  for (const app of data.apps) {
    const appId = generateId();
    await setDoc(doc(db, APPS_COLLECTION, appId), {
      ...app,
      id: undefined,
      ownerId: userId,
      memberIds: [userId],
      members: {
        [userId]: { email: userEmail, displayName: userName, photoURL: userPhoto, role: 'owner' }
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}
