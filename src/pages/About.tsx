import React from 'react';
import { Terminal, Mail, Compass, Globe } from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto py-16 px-6 text-left">
      <div className="flex flex-col items-center md:items-start gap-6 mb-12 text-center md:text-left">
        <div className="w-24 h-24 rounded-full bg-[var(--accent-bg)] border border-[var(--accent-border)] text-[var(--accent)] flex items-center justify-center font-extrabold text-4xl shadow-inner">
          ST
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-[var(--text-h)] tracking-tight mb-2">
            Sammy Thorne
          </h1>
          <p className="text-lg text-[var(--accent)] font-semibold">
            Software Engineer & Terminal Enthusiast
          </p>
        </div>
      </div>

      <div className="space-y-10 leading-relaxed text-[var(--text)] text-base">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[var(--text-h)] border-b border-[var(--border)] pb-2">
            About Me
          </h2>
          <p>
            Welcome! I am a computer science student and software developer. I build clean, efficient applications spanning both backend systems and modern web architectures. My engineering philosophy revolves around simplicity, understanding systems close to the hardware, and building reliable code.
          </p>
          <p>
            While I prefer terminal tools, C, and Rust, I have learned to love the productivity of full-stack ecosystems. Rebuilding this blog in under two hours with React was proof of that! This space serves as my personal digital garden where I share my thoughts, software discoveries, and learnings along the way.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-[var(--code-bg)] border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-3 text-[var(--text-h)] font-semibold">
              <Terminal className="w-5 h-5 text-[var(--accent)]" />
              <h3>Systems Engineering</h3>
            </div>
            <p className="text-sm">
              Passionate about lower-level languages like C and Rust. I love understanding how operating systems, memory allocation, and hardware interactions drive software efficiency.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-[var(--code-bg)] border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-3 text-[var(--text-h)] font-semibold">
              <Compass className="w-5 h-5 text-[var(--accent)]" />
              <h3>Full Stack Development</h3>
            </div>
            <p className="text-sm">
              Experienced building applications using Flutter & Dart, React & TypeScript, and backend architectures leveraging Node.js, REST APIs, and SQL.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-[var(--text-h)] border-b border-[var(--border)] pb-2">
            Philosophy & Mentorship
          </h2>
          <p>
            I believe that computer science is fundamentally about adaptability. Learning Javascript and React made me reflect on the importance of moving outside my comfort zone. It teaches you that a language is just a tool, and our real job is finding high-impact, maintainable solutions to actual problems.
          </p>
          <p>
            A special shout-out to my academic mentors and university professors, who have made a lasting impact on my journey and guided me toward starting my first corporate software engineering career!
          </p>
        </section>

        <section className="pt-6 border-t border-[var(--border)] flex flex-wrap justify-center md:justify-start gap-6">
          <a
            href="#"
            className="flex items-center gap-2 text-sm font-semibold hover:text-[var(--accent)] transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>GitHub</span>
          </a>
          <a
            href="mailto:sammy@dev-crypt.com"
            className="flex items-center gap-2 text-sm font-semibold hover:text-[var(--accent)] transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span>sammy@dev-crypt.com</span>
          </a>
        </section>
      </div>
    </div>
  );
};
