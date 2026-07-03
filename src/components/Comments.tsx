import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, ShieldAlert } from 'lucide-react';

interface Comment {
  commentId: number;
  commentText: string;
  postId: number;
  postTime: string;
  userId: string;
  userName: string;
}

interface CommentsProps {
  postId: number;
}

export const Comments: React.FC<CommentsProps> = ({ postId }) => {
  const { user, token } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const commentsApiUrl = import.meta.env.VITE_COMMENTS_API_URL || 'https://srv915664.hstgr.cloud:8081';

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(commentsApiUrl + '/posts/' + postId + '/comments?offset=0&limit=50');
      if (!res.ok) {
        throw new Error('Failed to retrieve comments.');
      }
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Comments fetching error:', err);
      setError(err.message || 'Error loading comments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !token || !user) return;

    try {
      setSubmitting(true);
      setError(null);
      
      const payload = {
        newUserId: user.userId,
        newPostId: postId,
        newCommentText: newComment,
      };

      const res = await fetch(commentsApiUrl + '/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error('Failed to post comment: ' + (errBody || res.statusText));
      }

      setNewComment('');
      await fetchComments();
    } catch (err: any) {
      console.error('Comment post error:', err);
      setError(err.message || 'Error posting comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-[var(--border)] max-w-2xl mx-auto px-4">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-[var(--accent)]" />
        <h3 className="text-xl font-semibold text-[var(--text-h)]">
          Comments ({comments.length})
        </h3>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] flex-shrink-0 flex items-center justify-center font-bold text-sm border border-[var(--accent-border)]">
              {user.userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-grow">
              <textarea
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full bg-[var(--code-bg)] text-[var(--text-h)] text-sm rounded-lg p-3 border border-transparent focus:border-[var(--accent-border)] focus:outline-none resize-y"
                required
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white disabled:opacity-50 disabled:hover:opacity-50 transition-opacity cursor-pointer"
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-8 p-4 rounded-lg bg-[var(--code-bg)] border border-[var(--border)] text-center">
          <p className="text-sm text-[var(--text)]">
            Please sign in with your Google account above to write a comment.
          </p>
        </div>
      )}

      {loading && comments.length === 0 ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[var(--text)] text-center py-6">
          No comments yet. Be the first to start the discussion!
        </p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.commentId} className="flex gap-3 text-left">
              <div className="w-9 h-9 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] flex-shrink-0 flex items-center justify-center font-bold text-sm border border-[var(--accent-border)]">
                {comment.userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-grow">
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-[var(--text-h)]">
                    {comment.userName}
                  </h4>
                  <span className="text-[11px] text-[var(--text)]">
                    {formatDate(comment.postTime)}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-h)] whitespace-pre-wrap break-words leading-relaxed">
                  {comment.commentText}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
