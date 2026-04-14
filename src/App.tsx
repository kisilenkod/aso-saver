import { useState, useEffect } from 'react';
import { AppEntry } from './types';
import { getApps, saveApp, deleteApp, isAuthenticated, setAuthenticated, hasPassword, setPassword, checkPassword, exportData, importData } from './utils/storage';
import Sidebar from './components/Sidebar';
import AppEditor from './components/AppEditor';
import LoginScreen from './components/LoginScreen';
import { LogOut, Download, Upload } from 'lucide-react';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function App() {
  const [authenticated, setAuth] = useState(isAuthenticated());
  const [apps, setApps] = useState<AppEntry[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (authenticated) {
      setApps(getApps());
    }
  }, [authenticated]);

  const handleLogin = (password: string) => {
    if (!hasPassword()) {
      setPassword(password);
      setAuthenticated(true);
      setAuth(true);
    } else if (checkPassword(password)) {
      setAuthenticated(true);
      setAuth(true);
    } else {
      return false;
    }
    return true;
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setAuth(false);
  };

  const handleAddApp = () => {
    const newApp: AppEntry = {
      id: generateId(),
      name: 'New App',
      bundleId: '',
      localizations: [
        { language: 'en-US', title: '', subtitle: '', keywords: '', description: '', screenshots: [] }
      ],
      descriptionVersions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveApp(newApp);
    const updated = getApps();
    setApps(updated);
    setSelectedAppId(newApp.id);
  };

  const handleDeleteApp = (id: string) => {
    deleteApp(id);
    const updated = getApps();
    setApps(updated);
    if (selectedAppId === id) {
      setSelectedAppId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleUpdateApp = (app: AppEntry) => {
    saveApp(app);
    setApps(getApps());
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aso-saver-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = importData(ev.target?.result as string);
          setApps(imported);
          setSelectedAppId(imported.length > 0 ? imported[0].id : null);
        } catch {
          alert('Invalid file format');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} isFirstTime={!hasPassword()} />;
  }

  const selectedApp = apps.find(a => a.id === selectedAppId) || null;

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
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="text-gray-400 hover:text-white p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
              </button>
            )}
            <h1 className="text-lg font-semibold text-white">
              {selectedApp ? selectedApp.name : 'ASO Saver'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Import"
            >
              <Upload size={16} />
              Import
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Export"
            >
              <Download size={16} />
              Export
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {selectedApp ? (
            <AppEditor app={selectedApp} onUpdate={handleUpdateApp} />
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
    </div>
  );
}
