'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import BrandLogo from '@/components/BrandLogo';

export default function Navbar() {
  const { user, logout, loading, isAdmin } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) return null;

  const isActive = (path: string) => pathname === path;
  const linkClass = (path: string) =>
    `px-4 py-2 rounded-full text-sm font-semibold transition-all ${
      isActive(path)
        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-blue-200'
        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80'
    }`;
  const mobileLinkClass = (path: string) =>
    `block w-full px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
      isActive(path)
        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-blue-200'
        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/80'
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-cyan-100/60 bg-white/85 backdrop-blur-xl">
      <div className="h-0.5 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center min-h-[72px]">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <BrandLogo size={36} />
              <div>
                <span className="block text-[1.05rem] font-black tracking-tight text-slate-900">OffCampus</span>
                <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-500">Learning OS</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-2 p-1 rounded-full bg-slate-100/80 ring-1 ring-slate-200/60">
              <Link href="/subjects" className={linkClass('/subjects')}>Courses</Link>
              {user && <Link href="/profile" className={linkClass('/profile')}>My Learning</Link>}
              {isAdmin && <Link href="/admin" className={linkClass('/admin')}>Admin</Link>}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/80 ring-1 ring-slate-200/70">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-full hover:bg-slate-100/80 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-semibold text-slate-700 hover:text-slate-950 px-3 py-2 rounded-full hover:bg-slate-100/80 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-5 py-2.5 rounded-full shadow-sm shadow-blue-200 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200/70 bg-white/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-2">
            <Link href="/subjects" className={mobileLinkClass('/subjects')} onClick={() => setMobileOpen(false)}>Courses</Link>
            {user && <Link href="/profile" className={mobileLinkClass('/profile')} onClick={() => setMobileOpen(false)}>My Learning</Link>}
            {isAdmin && <Link href="/admin" className={mobileLinkClass('/admin')} onClick={() => setMobileOpen(false)}>Admin</Link>}
            <div className="h-px my-2 bg-slate-200" />
            {user ? (
              <>
                <div className="px-2 py-1 text-sm text-slate-500">Signed in as {user.email}</div>
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full text-left px-3 py-2.5 rounded-full text-sm font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-1">
                <Link href="/login" className="flex-1 text-center px-3 py-2.5 rounded-full text-sm font-semibold text-slate-700 bg-slate-100" onClick={() => setMobileOpen(false)}>Sign in</Link>
                <Link href="/register" className="flex-1 text-center px-3 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600" onClick={() => setMobileOpen(false)}>Get Started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
