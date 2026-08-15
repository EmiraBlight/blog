import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { PostDetail } from './pages/PostDetail';
import { AdminDashboard } from './pages/AdminDashboard';
import { WritePost } from './pages/WritePost';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex flex-col min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
            <Navbar />
            
            <main className="flex-grow w-full">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/posts/:slug" element={<PostDetail />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/write" element={<WritePost />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </main>

            <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--text)]">
              <div className="w-[92%] max-w-[1600px] mx-auto px-6">
                <span>&copy; {new Date().getFullYear()} dev-crypt. All rights reserved.</span>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
