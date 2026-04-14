import { HistoryEntry } from '../types';
import { X } from 'lucide-react';

interface HistoryPanelProps {
  history: HistoryEntry[];
  onClose: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function HistoryPanel({ history, onClose }: HistoryPanelProps) {
  const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-end z-50" onClick={onClose}>
      <div
        className="w-96 max-w-full h-full bg-gray-900 border-l border-gray-800 flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Change History</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              No history yet
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {sorted.map(entry => (
                <div key={entry.id} className="px-4 py-3 hover:bg-gray-800/30 transition-colors">
                  <div className="flex items-start gap-3">
                    {entry.userPhoto ? (
                      <img
                        src={entry.userPhoto}
                        alt=""
                        className="w-8 h-8 rounded-full shrink-0 mt-0.5"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs text-gray-300">
                          {(entry.userName || '?')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-gray-200 truncate">
                          {entry.userName || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5 break-words">
                        {entry.action}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
