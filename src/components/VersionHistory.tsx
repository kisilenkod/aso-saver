import { DescriptionVersion } from '../types';
import { RotateCcw, X } from 'lucide-react';

interface Props {
  versions: DescriptionVersion[];
  onRestore: (description: string) => void;
  onClose: () => void;
}

export default function VersionHistory({ versions, onRestore, onClose }: Props) {
  if (versions.length === 0) {
    return (
      <div className="mt-3 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300">Version History</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        </div>
        <p className="text-sm text-gray-500">No saved versions yet. Click "Save version" to create one.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Version History</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {[...versions].reverse().map(version => (
          <div
            key={version.id}
            className="flex items-start gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-blue-400">{version.label}</span>
                <span className="text-xs text-gray-500">
                  {new Date(version.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-400 line-clamp-2">{version.description}</p>
            </div>
            <button
              onClick={() => onRestore(version.description)}
              className="shrink-0 p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-md transition-colors"
              title="Restore this version"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
