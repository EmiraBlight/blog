import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { generatePostId } from '../utils/hash';
import { Comments } from '../components/Comments';
import { ArrowLeft, Calendar, User, AlertCircle } from 'lucide-react';

interface BlogPost {
  id: number;
  title: string;
  blurb: string;
  dateTime: string;
  content?: string;
}

export const PostDetail: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const location = useLocation();

  const [post, setPost] = useState<BlogPost | null>(() => {
    const locState = location.state as { post?: BlogPost } | null;
    if (locState && locState.post) {
      return locState.post;
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    const locState = location.state as { post?: BlogPost } | null;
    if (locState && locState.post) {
      return false;
    }
    return true;
  });

  const [error, setError] = useState<string | null>(null);

  const numericPostId = Number(postId);
  const commentsApiUrl = import.meta.env.VITE_COMMENTS_API_URL || 'https://srv915664.hstgr.cloud:8081';

  useEffect(() => {
    if (post) return; // already initialized from location state

    const fetchAndFindPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(commentsApiUrl + '/posts');
        if (!res.ok) {
          throw new Error('Failed to retrieve blogs from database.');
        }
        const data = (await res.json()) as unknown[];
        if (Array.isArray(data)) {
          const mappedPosts = data.map((p: unknown) => {
            const item = p as Record<string, unknown>;
            const title = (item.pTitle || item.title || '') as string;
            const id = (item.pId || item.id || generatePostId(title)) as number;
            const blurb = (item.pBlurb || item.blurb || '') as string;
            const content = (item.pContent || item.content || '') as string;
            const dateTime = (item.pDateTime || item.dateTime || '') as string;
            return { id, title, blurb, content, dateTime };
          });

          const matched = mappedPosts.find((p: BlogPost) => p.id === numericPostId);
          if (matched) {
            setPost(matched);
          } else {
            throw new Error('Blog post not found.');
          }
        } else {
          throw new Error('Invalid format returned by the blog database.');
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Error retrieving blog post details:', err);
        setError(errorMsg || 'Error loading blog post.');
      } finally {
        setLoading(false);
      }
    };

    if (numericPostId) {
      void fetchAndFindPost();
    }
  }, [numericPostId, post, commentsApiUrl]);

  const renderContent = (text: string) => {
    return text.split('\n').map((paragraph, index) => {
      if (!paragraph.trim()) return null;
      
      const parts = paragraph.split(/([\u0060][^\u0060]+[\u0060])/g);
      const contentParts = parts.map((part, pIdx) => {
        const tick = String.fromCharCode(96);
        if (part.startsWith(tick) && part.endsWith(tick)) {
          return (
            <code key={pIdx} className="bg-[var(--code-bg)] px-1.5 py-0.5 rounded text-sm text-[var(--accent)] font-mono border border-[var(--border)] font-medium">
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      });

      return (
        <p key={index} className="mb-6 leading-relaxed text-[var(--text)] text-base md:text-lg">
          {contentParts}
        </p>
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-8 text-left">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text)] hover:text-[var(--accent)] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to publications</span>
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-[var(--text)] font-medium">Loading article details...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-center max-w-lg mx-auto flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8" />
          <h3 className="font-semibold text-lg">Unable to Open Article</h3>
          <p className="text-sm text-[var(--text)]">{error}</p>
        </div>
      ) : post ? (
        <article className="text-left">
          <header className="mb-10 pb-8 border-b border-[var(--border)]">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-[var(--text-h)] tracking-tight mb-6 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-[var(--text)] font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>{post.dateTime}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>By Sammy Thorne</span>
              </div>
            </div>
          </header>

          <div className="prose max-w-none mb-12">
            {post.content ? (
              renderContent(post.content)
            ) : (
              <p className="italic text-[var(--text)]">No content available for this post.</p>
            )}
          </div>

          <Comments postId={numericPostId} />
        </article>
      ) : null}
    </div>
  );
};
