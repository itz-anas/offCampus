'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Navbar from '@/components/Navbar';

interface Subject {
  id: number;
  title: string;
  description: string;
  section_count: number;
  video_count: number;
  is_enrolled: boolean;
}

export default function SubjectOverviewPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    api.get(`/subjects/${id}`)
      .then(res => setSubject(res.data.subject))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleEnroll = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setEnrolling(true);
    try {
      await api.post(`/subjects/${id}/enroll`);
      router.push(`/learn/${id}`);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 409) {
        router.push(`/learn/${id}`);
      }
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-5 bg-gray-200 rounded w-2/3" />
        </div>
      </>
    );
  }

  if (!subject) {
    return (
      <>
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-gray-500 text-lg">Subject not found</p>
          <Link href="/subjects" className="mt-4 inline-block text-indigo-600 hover:text-indigo-700">Back to courses</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link href="/subjects" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to courses
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 px-8 py-12">
            <h1 className="text-3xl font-bold text-white">{subject.title}</h1>
            <p className="mt-3 text-indigo-100 text-lg max-w-2xl">{subject.description}</p>
            <div className="mt-6 flex items-center gap-6 text-indigo-200 text-sm">
              <span className="flex items-center gap-1.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                {subject.section_count} sections
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {subject.video_count} videos
              </span>
            </div>
          </div>

          <div className="p-8">
            {subject.is_enrolled ? (
              <Link
                href={`/learn/${subject.id}`}
                className="inline-flex items-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
              >
                Continue Learning
                <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="inline-flex items-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {enrolling ? 'Enrolling...' : 'Enroll Now - Free'}
              </button>
            )}

            <div className="mt-8 pt-8 border-t border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About this course</h2>
              <p className="text-gray-600 leading-relaxed">{subject.description}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">What you&apos;ll get</h2>
              <ul className="space-y-3">
                {[
                  `${subject.video_count} structured video lessons`,
                  'Strict sequential learning path',
                  'Automatic progress tracking',
                  'Resume from where you left off',
                  'Course completion certificate tracking',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
