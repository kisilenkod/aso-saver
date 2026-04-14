import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from './firebase';
import { AppEntry } from './types';
import { subscribeToApps, createApp, saveApp, deleteApp, exportApps, importApps, saveUserProfile } from './utils/storage';
import Sidebar from './components/Sidebar';
import AppEditor from './components/AppEditor';
import LoginScreen from './components/LoginScreen';
import ShareDialog from './components/ShareDialog';
import { LogOut, Download, Upload, Users } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showShare, setShowShare] = useState(false);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        await saveUserProfile(u.uid, u.email || '', u.displayName || '', u.photoURL || '');
      }
    });
    return unsub;
  }, []);

  // Subscribe to user's apps
  useEffect(() => {
    if (!user) { setApps([]); return; }
    const unsub = subscribeToApps(user.uid, (fetchedApps) => {
      setApps(fetchedApps);
    });
    return unsub;
  }, [user]);

  const handleLogout = () => signOut(auth);

  const handleAddApp = async () => {
    if (!user) return;
    const newApp = await createApp(user.uid, user.email || '', user.displayName || '', user.photoURL || '');
    setSelectedAppId(newApp.id);
  };

  const handleDeleteApp = async (id: string) => {
    const app = apps.find(a => a.id === id);
    if (!app || !user) return;
    if (app.ownerId !== user.uid) return;
    await deleteApp(id);
    if (selectedAppId === id) {
      setSelectedAppId(null);
    }
  };

  const handleUpdateApp = async (app: AppEntry) => {
    await saveApp(app);
  };

  const handleExport = () => {
    const data = exportApps(apps);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aso-saver-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!user) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          await importApps(
            ev.target?.result as string,
            user.uid, user.email || '', user.displayName || '', user.photoURL || ''
          );
        } catch {
          alert('Invalid file format');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const selectedApp = apps.find(a => a.id === selectedAppId) || null;
  const userRole = selectedApp?.members[user.uid]?.role || 'viewer';
  const canEdit = userRole === 'owner' || userRole === 'editor';
  const canDelete = userRole === 'owner';

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <Sidebar
        apps={apps}
        selectedAppId={selectedAppId}
        onSelectApp={setSelectedAppId}
        onAddApp={handleAddApp}
        onDeleteApp={handleDeleteApp}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentUserId={user.uid}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
              </button>
            )}
            <h1 className="text-lg font-semibold text-white">
              {selectedApp ? selectedApp.name : 'ASO Saver'}
            </h1>
            {selectedApp && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                userRole === 'owner' ? 'bg-yellow-500/20 text-yellow-400' :
                userRole === 'editor' ? 'bg-blue-500/20 text-blue-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {userRole}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedApp && (
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                title="Share"
              >
                <Users size={16} />
                Share
              </button>
            )}
            <button onClick={handleImport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <Upload size={16} /> Import
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <Download size={16} /> Export
            </button>
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-800">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
              )}
              <button onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Logout">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {selectedApp ? (
            <AppEditor app={selectedApp} onUpdate={handleUpdateApp} canEdit={canEdit} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-xl mb-2">No app selected</p>
                <p className="text-sm">Select an app from the sidebar or create a new one</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {showShare && selectedApp && (
        <ShareDialog
          app={selectedApp}
          currentUserId={user.uid}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
