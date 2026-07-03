import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Search, Menu, X, LogOut, BookOpen, Sun, Moon, Laptop } from 'lucide-react';

declare const google: any;

export const Navbar: React.FC = () => {
  const { user, signIn, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const searchQuery = searchParams.get('q') || '';

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  useEffect(() => {
    if (!user && typeof google !== 'undefined') {
      try {
        google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1035659837943-dummy.apps.googleusercontent.com',
          callback: async (response: any) => {
            try {
              await signIn(response.credential);
            } catch (err) {
              console.error('Google Auth login failed:', err);
            }
          },
        });
        
        google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { theme: 'outline', size: 'medium', shape: 'pill' }
        );
      } catch (err) {
        console.error('Error initializing Google Identity Services:', err);
      }
    }
  }, [user]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (location.pathname !== '/') {
      navigate(val ? '/?q=' + encodeURIComponent(val) : '/');
    } else {
      if (val) {
        setSearchParams({ q: val });
      } else {
        setSearchParams({});
      }
    }
  };

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--bg)] py-4 px-6 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-xl tracking-tight text-[var(--text-h)] hover:opacity-85 transition-opacity">
          <BookOpen className="w-5 h-5 text-[var(--accent)]" />
          <span>dev-crypt</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 flex-grow max-w-xl mx-8">
          <div className="flex gap-6 text-sm font-medium">
            <Link to="/" className={'hover:text-[var(--accent)] transition-colors ' + (location.pathname === '/' ? 'text-[var(--accent)]' : 'text-[var(--text)]')}>
              Posts
            </Link>
            <Link to="/about" className={'hover:text-[var(--accent)] transition-colors ' + (location.pathname === '/about' ? 'text-[var(--accent)]' : 'text-[var(--text)]')}>
              About
            </Link>
          </div>

          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search posts..."
              className="w-full bg-[var(--code-bg)] text-[var(--text-h)] text-sm rounded-full pl-9 pr-4 py-1.5 focus:outline-none border border-transparent focus:border-[var(--accent-border)] transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}
            className="p-1.5 rounded-full hover:bg-[var(--code-bg)] text-[var(--text)] hover:text-[var(--text-h)] transition-colors cursor-pointer"
          >
            {theme === 'light' && <Sun className="w-4 h-4" />}
            {theme === 'dark' && <Moon className="w-4 h-4" />}
            {theme === 'system' && <Laptop className="w-4 h-4" />}
          </button>

          {/* Always render container so Google can bind to it, but hide it visually if user is logged in */}
          <div 
            id="google-signin-button" 
            style={{ display: user ? 'none' : 'block' }}
            className={user ? 'hidden' : 'block'}
          ></div>

          {user && (
            <div className="flex items-center gap-2 md:gap-3">
              <span className="text-sm font-medium text-[var(--text-h)] max-w-[100px] md:max-w-[150px] truncate">
                {user.userName}
              </span>
              <button
                onClick={signOut}
                title="Sign Out"
                className="p-1.5 rounded-full hover:bg-[var(--code-bg)] text-red-500 hover:text-red-600 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-[var(--text)] hover:bg-[var(--code-bg)] rounded transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-[var(--border)] flex flex-col gap-4 animate-fadeIn">
          <div className="flex flex-col gap-2 font-medium">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={'py-2 px-3 rounded hover:bg-[var(--code-bg)] transition-colors ' + (location.pathname === '/' ? 'text-[var(--accent)] bg-[var(--accent-bg)]' : 'text-[var(--text)]')}
            >
              Posts
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={'py-2 px-3 rounded hover:bg-[var(--code-bg)] transition-colors ' + (location.pathname === '/about' ? 'text-[var(--accent)] bg-[var(--accent-bg)]' : 'text-[var(--text)]')}
            >
              About
            </Link>
          </div>

          <div className="relative mx-3">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search posts..."
              className="w-full bg-[var(--code-bg)] text-[var(--text-h)] text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none border border-transparent focus:border-[var(--accent-border)]"
            />
          </div>
        </div>
      )}
    </nav>
  );
};
