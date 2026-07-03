import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { generatePostId } from '../utils/hash';
import { Calendar, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';

interface BlogPost {
  title: string;
  blurb: string;
  dateTime: string;
  content?: string;
}

export const Home: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') || '';
  const postsApiUrl = import.meta.env.VITE_POSTS_API_URL || 'https://srv915664.hstgr.cloud:8000';

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(postsApiUrl + '/blogs.json');
        if (!res.ok) {
          throw new Error('Failed to retrieve blog posts.');
        }
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Error fetching blog posts:', err);
        setError(err.message || 'Error loading blog posts.');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const filteredPosts = posts.filter((post) => {
    const query = searchQuery.toLowerCase();
    const titleMatch = post.title?.toLowerCase().includes(query) || false;
    const blurbMatch = post.blurb?.toLowerCase().includes(query) || false;
    const contentMatch = post.content?.toLowerCase().includes(query) || false;
    return titleMatch || blurbMatch || contentMatch;
  });

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-12 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--text-h)] mb-4">
          Latest Publications
        </h1>
        <p className="text-lg text-[var(--text)] max-w-2xl">
          Thoughts, ideas, and software engineering experiences. Rebuilding the terminal and web.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-[var(--text)] font-medium">Fetching posts...</span>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-center max-w-lg mx-auto flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8" />
          <h3 className="font-semibold text-lg">Unable to Load Blog Posts</h3>
          <p className="text-sm text-[var(--text)]">{error}</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 max-w-md mx-auto">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[var(--text-h)] mb-2">No posts found</h3>
          <p className="text-sm text-[var(--text)]">
            We could not find any articles matching "{searchQuery}". Try searching for something else.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {filteredPosts.map((post) => {
            const postId = generatePostId(post.title);
            return (
              <article
                key={postId}
                className="group border-b border-[var(--border)] pb-10 flex flex-col md:flex-row gap-6 md:gap-12 items-baseline text-left"
              >
                <div className="w-full md:w-1/4 flex-shrink-0 flex items-center gap-2 text-sm text-[var(--text)] font-medium">
                  <Calendar className="w-4 h-4" />
                  <span>{post.dateTime}</span>
                </div>

                <div className="w-full md:w-3/4 flex flex-col gap-3">
                  <h2 className="text-2xl font-bold text-[var(--text-h)] group-hover:text-[var(--accent)] transition-colors">
                    <Link to={'/post/' + postId} state={{ post }}>
                      {post.title}
                    </Link>
                  </h2>
                  <p className="text-[var(--text)] leading-relaxed text-base">
                    {post.blurb}
                  </p>
                  <div className="mt-2">
                    <Link
                      to={'/post/' + postId}
                      state={{ post }}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] hover:underline"
                    >
                      <span>Read article</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
