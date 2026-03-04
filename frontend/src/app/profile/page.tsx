'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';

interface Enrollment {
  enrollment_id: number;
  enrolled_at: string;
  subject_id: number;
  subject_title: string;
  subject_description: string;
  total_videos: number;
  completed_videos: number;
  progress_percent: number;
}

interface ProfileData {
  user: { id: number; name: string; email: string; role: string; created_at: string };
  enrollments: Enrollment[];
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      api.get('/profile')
        .then(res => setData(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
          <div className="h-24 bg-gray-200 rounded mb-6" />
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-24 bg-gray-200 rounded" />)}
          </div>
        </div>
      </>
    );
  }

  if (!data) return null;

  const totalCompleted = data.enrollments.reduce((sum, e) => sum + e.completed_videos, 0);
  const coursesCompleted = data.enrollments.filter(e => e.progress_percent === 100).length;

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Profile header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-indigo-700">{data.user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{data.user.name}</h1>
              <p className="text-gray-500">{data.user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{data.enrollments.length}</div>
              <div className="text-sm text-gray-500">Enrolled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalCompleted}</div>
              <div className="text-sm text-gray-500">Videos Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{coursesCompleted}</div>
              <div className="text-sm text-gray-500">Courses Finished</div>
            </div>
          </div>
        </div>

        {/* Enrollments */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">My Courses</h2>
        {data.enrollments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-4">You haven&apos;t enrolled in any courses yet</p>
            <Link href="/subjects" className="text-indigo-600 font-medium hover:text-indigo-700">Browse courses</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {data.enrollments.map(enrollment => (
              <Link key={enrollment.enrollment_id} href={`/learn/${enrollment.subject_id}`} className="block">
                <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{enrollment.subject_title}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{enrollment.subject_description}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className={`text-2xl font-bold ${enrollment.progress_percent === 100 ? 'text-green-600' : 'text-indigo-600'}`}>
                        {enrollment.progress_percent}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>{enrollment.completed_videos} / {enrollment.total_videos} videos</span>
                      {enrollment.progress_percent === 100 && <span className="text-green-600 font-medium">Completed</span>}
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${enrollment.progress_percent === 100 ? 'bg-green-500' : 'bg-indigo-600'}`}
                        style={{ width: `${enrollment.progress_percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
