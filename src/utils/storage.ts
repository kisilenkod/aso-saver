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
    history: [{ id: generateId(), userId, userName, userPhoto, action: 'Created app', timestamp: Date.now() }],
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

// CSV helpers
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      current += ch;
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        current += ch;
      } else if (ch === '\n') {
        if (current.endsWith('\r')) current = current.slice(0, -1);
        rows.push(parseCsvLine(current));
        current = '';
      } else {
        current += ch;
      }
    }
  }
  if (current.trim()) {
    if (current.endsWith('\r')) current = current.slice(0, -1);
    rows.push(parseCsvLine(current));
  }
  return rows;
}

// Export/Import as CSV
const CSV_HEADERS = ['App Name', 'Bundle ID', 'App Store URL', 'Version', 'Language', 'Title', 'Subtitle', 'Keywords', 'Description'];

export function exportApps(apps: AppEntry[]): string {
  const lines: string[] = [CSV_HEADERS.map(escapeCsv).join(',')];

  for (const app of apps) {
    for (const version of app.versions) {
      for (const loc of version.localizations) {
        const row = [
          app.name,
          app.bundleId,
          app.appStoreUrl || '',
          version.version,
          loc.language,
          loc.title,
          loc.subtitle,
          loc.keywords,
          loc.description,
        ];
        lines.push(row.map(escapeCsv).join(','));
      }
    }
  }

  return lines.join('\n');
}

export async function importApps(csv: string, userId: string, userEmail: string, userName: string, userPhoto: string): Promise<void> {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error('Invalid CSV');

  const header = rows[0].map(h => h.trim());
  const idx = (name: string) => {
    const i = header.indexOf(name);
    if (i === -1) throw new Error(`Missing column: ${name}`);
    return i;
  };

  const iName = idx('App Name');
  const iBundle = idx('Bundle ID');
  const iUrl = idx('App Store URL');
  const iVersion = idx('Version');
  const iLang = idx('Language');
  const iTitle = idx('Title');
  const iSubtitle = idx('Subtitle');
  const iKeywords = idx('Keywords');
  const iDesc = idx('Description');

  // Group rows by app name
  const appMap = new Map<string, { bundleId: string; appStoreUrl: string; versions: Map<string, { language: string; title: string; subtitle: string; keywords: string; description: string }[]> }>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < CSV_HEADERS.length) continue;

    const appName = row[iName].trim();
    if (!appName) continue;

    if (!appMap.has(appName)) {
      appMap.set(appName, { bundleId: row[iBundle] || '', appStoreUrl: row[iUrl] || '', versions: new Map() });
    }
    const appData = appMap.get(appName)!;

    const versionName = row[iVersion] || '1.0';
    if (!appData.versions.has(versionName)) {
      appData.versions.set(versionName, []);
    }
    appData.versions.get(versionName)!.push({
      language: row[iLang] || 'en-US',
      title: row[iTitle] || '',
      subtitle: row[iSubtitle] || '',
      keywords: row[iKeywords] || '',
      description: row[iDesc] || '',
    });
  }

  // Create apps in Firestore
  for (const [appName, appData] of appMap) {
    const versions = Array.from(appData.versions.entries()).map(([versionName, locs]) => ({
      id: generateId(),
      version: versionName,
      localizations: locs.map(l => ({ ...l, screenshots: [] })),
      createdAt: Date.now(),
    }));

    const appId = generateId();
    await setDoc(doc(db, APPS_COLLECTION, appId), {
      name: appName,
      bundleId: appData.bundleId,
      icon: '',
      appStoreUrl: appData.appStoreUrl,
      versions,
      activeVersionId: versions[0].id,
      ownerId: userId,
      memberIds: [userId],
      members: {
        [userId]: { email: userEmail, displayName: userName, photoURL: userPhoto, role: 'owner' }
      },
      pendingEmails: [],
      pendingInvites: {},
      history: [{ id: generateId(), userId, userName, userPhoto: '', action: 'Imported from CSV', timestamp: Date.now() }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}
