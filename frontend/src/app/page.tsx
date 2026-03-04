'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import BrandLogo from '@/components/BrandLogo';

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium mb-6">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                Structured Learning Platform
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
                Master skills with
                <span className="text-indigo-600"> structured</span> learning paths
              </h1>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-2xl">
                A professional LMS with strict lesson ordering, real-time progress tracking, and curated course content. 
                Learn at your own pace with guided video lessons.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                {!loading && !user ? (
                  <>
                    <Link href="/register" className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold text-base hover:bg-indigo-700 shadow-sm">
                      Start Learning Free
                      <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </Link>
                    <Link href="/subjects" className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold text-base hover:bg-gray-50">
                      Browse Courses
                    </Link>
                  </>
                ) : (
                  <Link href="/subjects" className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold text-base hover:bg-indigo-700 shadow-sm">
                    Browse Courses
                    <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-50 to-transparent -z-10 hidden lg:block" />
        </section>

        {/* Features */}
        <section className="bg-gray-50 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900">Why OffCampus?</h2>
              <p className="mt-3 text-gray-600 text-lg">Built for serious learners who want structure and accountability</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  title: 'Structured Learning Paths',
                  desc: 'Courses follow a strict sequential order. Complete each lesson before moving to the next, ensuring solid understanding.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  ),
                },
                {
                  title: 'Real-Time Progress',
                  desc: 'Track your learning journey with precise progress metrics. Auto-completion at 90% watch time keeps you accountable.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  ),
                },
                {
                  title: 'Resume Anywhere',
                  desc: 'Pick up exactly where you left off. Your position is saved automatically so you never lose progress.',
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ),
                },
              ].map((f, i) => (
                <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 hover:border-indigo-100 hover:shadow-md">
                  <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-white py-20">
          <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900">Ready to start learning?</h2>
            <p className="mt-4 text-lg text-gray-600">Join thousands of learners building real skills with structured courses.</p>
            <div className="mt-8">
              <Link href={user ? '/subjects' : '/register'} className="inline-flex items-center px-8 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm">
                {user ? 'Browse Courses' : 'Create Free Account'}
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative overflow-hidden bg-slate-950 text-slate-300">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(6,182,212,0.24),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2),transparent_35%)]" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <div className="grid md:grid-cols-3 gap-10">
              <div>
                <div className="flex items-center gap-3">
                  <BrandLogo size={34} className="rounded-xl" />
                  <div>
                    <p className="text-white text-lg font-black tracking-tight">OffCampus</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Learning OS</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-sm">
                  A focused platform for structured learning paths, measurable progress, and consistent outcomes.
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-white mb-4">Explore</p>
                <div className="space-y-2 text-sm">
                  <Link href="/subjects" className="block hover:text-cyan-300 transition-colors">Courses</Link>
                  {user ? (
                    <Link href="/profile" className="block hover:text-cyan-300 transition-colors">My Learning</Link>
                  ) : (
                    <Link href="/register" className="block hover:text-cyan-300 transition-colors">Create Account</Link>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-white mb-4">Statement</p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Build practical skills with curriculum-first design, not endless content feeds.
                </p>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-500">&copy; {new Date().getFullYear()} OffCampus. All rights reserved.</p>
              <p className="text-xs text-slate-500">Crafted for focused learners.</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
