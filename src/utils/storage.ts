import { db } from '../firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, arrayUnion, arrayRemove,
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
    const apps = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppEntry));
    apps.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    callback(apps);
  });
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
      [userId]: { email: userEmail, displayName: userName, photoURL: userPhoto, role: 'owner' }
    },
    pendingEmails: [],
    pendingInvites: {},
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

// Sharing — invite by email. If user exists, add directly. If not, add as pending.
export async function inviteMember(
  appId: string,
  email: string,
  role: 'editor' | 'viewer'
): Promise<'added' | 'pending'> {
  const appRef = doc(db, APPS_COLLECTION, appId);

  // Check if user already registered
  const user = await findUserByEmail(email);
  if (user) {
    await updateDoc(appRef, {
      memberIds: arrayUnion(user.uid),
      [`members.${user.uid}`]: { email: user.email, displayName: user.displayName, photoURL: user.photoURL, role },
    });
    return 'added';
  }

  // User not registered yet — add as pending invite
  await updateDoc(appRef, {
    pendingEmails: arrayUnion(email),
    [`pendingInvites.${email.replace(/\./g, '_dot_')}`]: { email, role, invitedAt: Date.now() },
  });
  return 'pending';
}

export async function updateMemberRole(
  appId: string,
  userId: string,
  role: 'editor' | 'viewer'
): Promise<void> {
  await updateDoc(doc(db, APPS_COLLECTION, appId), {
    [`members.${userId}.role`]: role,
  });
}

export async function updatePendingRole(
  appId: string,
  email: string,
  role: 'editor' | 'viewer'
): Promise<void> {
  const key = email.replace(/\./g, '_dot_');
  await updateDoc(doc(db, APPS_COLLECTION, appId), {
    [`pendingInvites.${key}.role`]: role,
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

export async function removePendingInvite(appId: string, email: string): Promise<void> {
  const appRef = doc(db, APPS_COLLECTION, appId);
  const snap = await getDoc(appRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const pendingInvites = { ...data.pendingInvites };
  const key = email.replace(/\./g, '_dot_');
  delete pendingInvites[key];
  await updateDoc(appRef, {
    pendingEmails: arrayRemove(email),
    pendingInvites,
  });
}

// Activate pending invites for a newly logged in user
export async function activatePendingInvites(
  userId: string,
  email: string,
  displayName: string,
  photoURL: string
): Promise<void> {
  const q = query(
    collection(db, APPS_COLLECTION),
    where('pendingEmails', 'array-contains', email)
  );
  const snap = await getDocs(q);

  for (const appDoc of snap.docs) {
    const data = appDoc.data();
    const key = email.replace(/\./g, '_dot_');
    const invite = data.pendingInvites?.[key];
    const role = invite?.role || 'viewer';

    const pendingInvites = { ...data.pendingInvites };
    delete pendingInvites[key];

    await updateDoc(appDoc.ref, {
      memberIds: arrayUnion(userId),
      [`members.${userId}`]: { email, displayName, photoURL, role },
      pendingEmails: arrayRemove(email),
      pendingInvites,
    });
  }
}

async function findUserByEmail(email: string): Promise<{ uid: string; email: string; displayName: string; photoURL: string } | null> {
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
  const exportData = apps.map(({ memberIds, members, ownerId, pendingEmails, pendingInvites, ...rest }) => rest);
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
      pendingEmails: [],
      pendingInvites: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}
