import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { generatePostId } from '../utils/hash';
import { Comments } from '../components/Comments';
import { ArrowLeft, Calendar, User, AlertCircle } from 'lucide-react';

interface BlogPost {
  title: string;
  blurb: string;
  dateTime: string;
  content?: string;
}

export const PostDetail: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const location = useLocation();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const numericPostId = Number(postId);
  const postsApiUrl = import.meta.env.VITE_POSTS_API_URL || 'https://srv915664.hstgr.cloud:8000';

  useEffect(() => {
    if (location.state && (location.state as any).post) {
      setPost((location.state as any).post);
      setLoading(false);
      return;
    }

    const fetchAndFindPost = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(postsApiUrl + '/blogs.json');
        if (!res.ok) {
          throw new Error('Failed to retrieve blogs from database.');
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          const matched = data.find((p: BlogPost) => generatePostId(p.title) === numericPostId);
          if (matched) {
            setPost(matched);
          } else {
            throw new Error('Blog post not found.');
          }
        } else {
          throw new Error('Invalid format returned by the blog database.');
        }
      } catch (err: any) {
        console.error('Error retrieving blog post details:', err);
        setError(err.message || 'Error loading blog post.');
      } finally {
        setLoading(false);
      }
    };

    if (numericPostId) {
      fetchAndFindPost();
    }
  }, [numericPostId, location.state]);

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
