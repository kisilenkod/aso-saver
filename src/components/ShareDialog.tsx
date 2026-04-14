import { useState } from 'react';
import { AppEntry, MemberRole } from '../types';
import { inviteMember, updateMemberRole, updatePendingRole, removeMember, removePendingInvite } from '../utils/storage';
import { X, UserPlus, Trash2, Crown, Pencil, Eye, Clock } from 'lucide-react';

interface Props {
  app: AppEntry;
  currentUserId: string;
  onClose: () => void;
}

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_ICONS: Record<MemberRole, typeof Crown> = {
  owner: Crown,
  editor: Pencil,
  viewer: Eye,
};

export default function ShareDialog({ app, currentUserId, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentUserRole = app.members[currentUserId]?.role;
  const isOwner = currentUserRole === 'owner';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    // Check if already a member
    const existingMember = Object.values(app.members).find(m => m.email === trimmed);
    if (existingMember) {
      setError('This email already has access.');
      return;
    }
    // Check if already pending
    const pendingInvites = app.pendingInvites || {};
    const alreadyPending = Object.values(pendingInvites).find((inv: any) => inv.email === trimmed);
    if (alreadyPending) {
      setError('Invite already sent to this email.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await inviteMember(app.id, trimmed, role);
      if (result === 'added') {
        setSuccess(`Added with ${ROLE_LABELS[role]} access`);
      } else {
        setSuccess(`Invite sent! Access will activate when they sign in.`);
      }
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to invite');
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: 'editor' | 'viewer') => {
    try {
      await updateMemberRole(app.id, userId, newRole);
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    }
  };

  const handlePendingRoleChange = async (pendingEmail: string, newRole: 'editor' | 'viewer') => {
    try {
      await updatePendingRole(app.id, pendingEmail, newRole);
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeMember(app.id, userId);
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    }
  };

  const handleRemovePending = async (pendingEmail: string) => {
    try {
      await removePendingInvite(app.id, pendingEmail);
    } catch (err: any) {
      setError(err.message || 'Failed to remove invite');
    }
  };

  const memberEntries = Object.entries(app.members);
  const pendingInvites = app.pendingInvites || {};
  const pendingEntries = Object.values(pendingInvites) as Array<{ email: string; role: 'editor' | 'viewer'; invitedAt: number }>;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Share "{app.name}"</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Invite form */}
        {isOwner && (
          <form onSubmit={handleInvite} className="p-4 border-b border-gray-800">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); setSuccess(''); }}
                placeholder="Enter email address"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
              />
              <select value={role} onChange={e => setRole(e.target.value as 'editor' | 'viewer')}
                className="px-2 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button type="submit" disabled={loading || !email.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors disabled:opacity-40">
                <UserPlus size={16} />
              </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            {success && <p className="text-green-400 text-xs mt-2">{success}</p>}
          </form>
        )}

        {/* Members list */}
        <div className="p-4 max-h-80 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase font-medium mb-3">
            Members ({memberEntries.length})
          </p>
          <div className="space-y-2">
            {memberEntries.map(([userId, member]) => {
              const RoleIcon = ROLE_ICONS[member.role];
              return (
                <div key={userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50">
                  {member.photoURL ? (
                    <img src={member.photoURL} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                      {(member.displayName || member.email)[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{member.displayName || member.email}</p>
                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner && member.role !== 'owner' ? (
                      <>
                        <select value={member.role} onChange={e => handleRoleChange(userId, e.target.value as 'editor' | 'viewer')}
                          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none">
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button onClick={() => handleRemove(userId)}
                          className="p-1 text-gray-500 hover:text-red-400 transition-colors" title="Remove">
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400 px-2 py-1">
                        <RoleIcon size={12} />
                        {ROLE_LABELS[member.role]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pending invites */}
          {pendingEntries.length > 0 && (
            <>
              <p className="text-xs text-gray-500 uppercase font-medium mb-3 mt-5">
                Pending ({pendingEntries.length})
              </p>
              <div className="space-y-2">
                {pendingEntries.map(invite => (
                  <div key={invite.email} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/50">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <Clock size={14} className="text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{invite.email}</p>
                      <p className="text-xs text-yellow-500/70">Waiting for sign in...</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <>
                          <select value={invite.role} onChange={e => handlePendingRoleChange(invite.email, e.target.value as 'editor' | 'viewer')}
                            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none">
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button onClick={() => handleRemovePending(invite.email)}
                            className="p-1 text-gray-500 hover:text-red-400 transition-colors" title="Cancel invite">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
