import { AppEntry } from '../types';
import { Plus, Trash2, ChevronLeft, Smartphone } from 'lucide-react';

interface Props {
  apps: AppEntry[];
  selectedAppId: string | null;
  onSelectApp: (id: string) => void;
  onAddApp: () => void;
  onDeleteApp: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  currentUserId: string;
}

export default function Sidebar({ apps, selectedAppId, onSelectApp, onAddApp, onDeleteApp, isOpen, onToggle, currentUserId }: Props) {
  if (!isOpen) return null;

  return (
    <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-800">
        <span className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Apps</span>
        <div className="flex items-center gap-1">
          <button onClick={onAddApp}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Add app">
            <Plus size={18} />
          </button>
          <button onClick={onToggle}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="Collapse sidebar">
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {apps.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No apps yet. Click + to add one.
          </div>
        ) : (
          apps.map(app => {
            const isOwner = app.ownerId === currentUserId;
            return (
              <div
                key={app.id}
                className={`group flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                  selectedAppId === app.id ? 'bg-blue-600/20 text-blue-400' : 'text-gray-300 hover:bg-gray-800'
                }`}
                onClick={() => onSelectApp(app.id)}
              >
                {app.icon ? (
                  <img src={app.icon} alt="" className="w-8 h-8 rounded-lg shrink-0 object-cover" />
                ) : (
                  <Smartphone size={18} className="shrink-0 opacity-60" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{app.name}</p>
                  {app.bundleId && <p className="text-xs text-gray-500 truncate">{app.bundleId}</p>}
                </div>
                {isOwner && (
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteApp(app.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                    title="Delete app"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
