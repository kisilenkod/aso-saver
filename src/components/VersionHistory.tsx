import { useState } from 'react';
import { DescriptionVersion } from '../types';
import { RotateCcw, X, Eye, EyeOff } from 'lucide-react';

interface Props {
  versions: DescriptionVersion[];
  onRestore: (description: string) => void;
  onClose: () => void;
}

export default function VersionHistory({ versions, onRestore, onClose }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        <h3 className="text-sm font-medium text-gray-300">Version History ({versions.length})</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {[...versions].reverse().map(version => {
          const isExpanded = expandedId === version.id;
          return (
            <div
              key={version.id}
              className="p-3 bg-gray-900 rounded-lg border border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">{version.label}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(version.timestamp).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-600">
                      {version.description.length} chars
                    </span>
                  </div>
                  {!isExpanded && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{version.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : version.id)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => onRestore(version.description)}
                    className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-md transition-colors"
                    title="Restore this version"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>
              {isExpanded && (
                <pre className="mt-2 p-3 bg-gray-950 rounded-lg text-xs text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto border border-gray-800">
                  {version.description}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
