import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, BookOpen, AlertCircle, CheckCircle, Send } from 'lucide-react';

export const WritePost: React.FC = () => {
  const { user, token, isWriter, roles } = useAuth();
  const [title, setTitle] = useState('');
  const [blurb, setBlurb] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commentsApiUrl = import.meta.env.VITE_COMMENTS_API_URL || 'https://srv915664.hstgr.cloud:8081';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isWriter) return;

    if (!title.trim() || !blurb.trim() || !content.trim()) {
      setError('All fields are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const payload = {
        newPostTitle: title,
        newPostBlurb: blurb,
        newPostContent: content,
      };

      const res = await fetch(commentsApiUrl + '/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error('Failed to publish post: ' + (errText || res.statusText));
      }

      setSuccess('Publication published successfully!');
      setTitle('');
      setBlurb('');
      setContent('');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Error publishing blog post:', err);
      setError(errorMsg || 'Error occurred while publishing.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-20 px-6 text-center">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-[var(--text-h)] mb-3">Authentication Required</h2>
        <p className="text-sm text-[var(--text)] mb-6">
          Please sign in using your Google Account at the top of the page to access the writing tools.
        </p>
      </div>
    );
  }

  if (!isWriter) {
    return (
      <div className="max-w-md mx-auto py-20 px-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6 animate-pulse" />
        <h2 className="text-2xl font-bold text-[var(--text-h)] mb-3">Access Denied</h2>
        <p className="text-sm text-[var(--text)]">
          You do not have the required writer privileges to publish articles.
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
            <BookOpen className="w-8 h-8 text-[var(--accent)]" />
            Write a New Post
          </h1>
          <p className="text-sm text-[var(--text)] mt-1">
            Draft and publish a new article to the blog.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--accent)] text-xs font-semibold">
          <span>Active Roles: {roles.join(', ')}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <section className="bg-[var(--code-bg)] p-8 rounded-xl border border-[var(--border)]">
          <h2 className="text-xl font-bold text-[var(--text-h)] mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--accent)]" />
            Publish New Article
          </h2>

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-sm flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold tracking-wider uppercase text-[var(--text)] mb-2">
                Article Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Building an Antigravity Terminal with Rust"
                className="w-full bg-[var(--bg)] text-[var(--text-h)] text-sm rounded-lg p-3 border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider uppercase text-[var(--text)] mb-2">
                Blurb / Short Description
              </label>
              <input
                type="text"
                value={blurb}
                onChange={(e) => setBlurb(e.target.value)}
                placeholder="e.g. A deep dive into modern terminal emulation and rendering performance."
                className="w-full bg-[var(--bg)] text-[var(--text-h)] text-sm rounded-lg p-3 border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider uppercase text-[var(--text)] mb-2 flex justify-between items-center">
                <span>Article Content</span>
                <span className="text-[10px] text-gray-500 lowercase font-normal">Supports standard line breaks. Wrap code blocks in tick marks.</span>
              </label>
              <textarea
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your article content here..."
                className="w-full bg-[var(--bg)] text-[var(--text-h)] text-sm rounded-lg p-4 border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none transition-colors font-sans resize-y"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white disabled:opacity-50 disabled:hover:opacity-50 transition-opacity cursor-pointer shadow-md shadow-[var(--accent)]/10"
              >
                {loading ? 'Publishing...' : 'Publish Publication'}
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
