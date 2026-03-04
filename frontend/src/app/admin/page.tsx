'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface AdminSubject {
  id: number;
  title: string;
  description: string;
  is_published: boolean;
  section_count: number;
  video_count: number;
  enrollment_count: number;
  created_at: string;
}

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [subjects, setSubjects] = useState<AdminSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ subjects_created: number; sections_created: number; videos_created: number; errors: string[] } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      router.push('/');
      return;
    }
    if (isAdmin) {
      fetchSubjects();
    }
  }, [user, isAdmin, authLoading, router]);

  const fetchSubjects = () => {
    api.get('/admin/subjects')
      .then(res => setSubjects(res.data.subjects))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/admin/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(res.data.summary);
      fetchSubjects();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setUploadError(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTogglePublish = async (subjectId: number) => {
    try {
      await api.patch(`/admin/subjects/${subjectId}/publish`);
      fetchSubjects();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (subjectId: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This will delete all sections, videos, and student progress.`)) return;
    try {
      await api.delete(`/admin/subjects/${subjectId}`);
      fetchSubjects();
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || loading) {
    return (
      <>
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-10 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8" />
          <div className="h-40 bg-gray-200 rounded mb-8" />
          <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded" />)}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Upload section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Course from Excel</h2>
          <p className="text-sm text-gray-600 mb-4">
            Upload an Excel file (.xlsx) with columns: subject_title, subject_description, section_title, section_order, video_title, video_order, youtube_url
          </p>

          <div className="flex items-center gap-4">
            <label className={`inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
              uploading ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}>
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {uploading ? 'Uploading...' : 'Choose Excel File'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {uploadError && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{uploadError}</div>
          )}

          {uploadResult && (
            <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200">
              <h3 className="text-sm font-semibold text-green-800 mb-2">Import Successful</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-green-700 font-medium">{uploadResult.subjects_created}</span>
                  <span className="text-green-600 ml-1">subjects created</span>
                </div>
                <div>
                  <span className="text-green-700 font-medium">{uploadResult.sections_created}</span>
                  <span className="text-green-600 ml-1">sections created</span>
                </div>
                <div>
                  <span className="text-green-700 font-medium">{uploadResult.videos_created}</span>
                  <span className="text-green-600 ml-1">videos created</span>
                </div>
              </div>
              {uploadResult.errors?.length > 0 && (
                <div className="mt-3 text-xs text-orange-700">
                  {uploadResult.errors.map((e: string, i: number) => <p key={i}>{e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subjects list */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Manage Courses ({subjects.length})</h2>
        {subjects.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
            No courses yet. Upload an Excel file to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {subjects.map(subject => (
              <div key={subject.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{subject.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        subject.is_published ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {subject.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{subject.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{subject.section_count} sections</span>
                      <span>{subject.video_count} videos</span>
                      <span>{subject.enrollment_count} enrolled</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePublish(subject.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        subject.is_published
                          ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                          : 'border-green-300 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {subject.is_published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleDelete(subject.id, subject.title)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
