import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertCircle, HelpCircle } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { user, isAdmin, isModerator, roles } = useAuth();

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 px-6 text-center">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-[var(--text-h)] mb-3">Authentication Required</h2>
        <p className="text-sm text-[var(--text)] mb-6">
          Please sign in using your Google Account at the top of the page to access the admin services.
        </p>
      </div>
    );
  }

  if (!isModerator && !isAdmin) {
    return (
      <div className="max-w-md mx-auto py-20 px-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6 animate-pulse" />
        <h2 className="text-2xl font-bold text-[var(--text-h)] mb-3">Access Denied</h2>
        <p className="text-sm text-[var(--text)]">
          You do not have the required administrative or moderator privileges to access this board.
        </p>
        <div className="mt-6 p-4 rounded-lg bg-[var(--code-bg)] border border-[var(--border)] text-left text-xs font-mono text-[var(--text)]">
          UID: {user.userId}<br />
          Email: {user.email}<br />
          Roles: {roles.length > 0 ? roles.join(', ') : 'none'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6 text-left">
      <header className="mb-10 pb-6 border-b border-[var(--border)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-h)] tracking-tight flex items-center gap-2.5">
            <Shield className="w-8 h-8 text-[var(--accent)]" />
            Admin Board
          </h1>
          <p className="text-sm text-[var(--text)] mt-1">
            Moderate reader discussions and configure site systems.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--accent)] text-xs font-semibold">
          <span>Active Roles: {roles.join(', ')}</span>
        </div>
      </header>

      {/* Moderator Info Card */}
      {isModerator && (
        <div className="p-6 rounded-xl bg-[var(--code-bg)] border border-[var(--border)] mb-8 flex gap-4">
          <HelpCircle className="w-8 h-8 text-[var(--accent)] flex-shrink-0" />
          <div>
            <h3 className="font-bold text-[var(--text-h)] mb-1">Moderator Privileges</h3>
            <p className="text-sm text-[var(--text)] leading-relaxed">
              As a moderator, you have permission to delete inappropriate user comments. 
              To moderate comments, simply navigate to any blog post page—you will find an 
              active delete icon next to every comment timestamp.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
