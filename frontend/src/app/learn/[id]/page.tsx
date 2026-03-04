'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Video {
  id: number;
  title: string;
  youtube_url: string;
  duration_seconds: number;
  order_index: number;
  section_id: number;
  global_index: number;
  previous_video_id: number | null;
  next_video_id: number | null;
  locked: boolean;
  unlock_reason: string | null;
  is_completed: boolean;
  last_position_seconds: number;
}

interface Section {
  id: number;
  title: string;
  order_index: number;
  videos: Video[];
}

interface CourseData {
  subject: { id: number; title: string; description: string };
  sections: Section[];
  flat_videos: Video[];
  progress: { total: number; completed: number; percent: number };
  is_enrolled: boolean;
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(/embed\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  const match2 = url.match(/v=([a-zA-Z0-9_-]+)/);
  if (match2) return match2[1];
  return null;
}

export default function LearnPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const playerRef = useRef<HTMLIFrameElement | null>(null);

  const fetchCourse = useCallback(async () => {
    try {
      const res = await api.get(`/subjects/${id}/tree`);
      const data = res.data as CourseData;
      setCourseData(data);

      if (!activeVideoId && data.flat_videos.length > 0) {
        // Find the first unlocked, incomplete video, or the first video
        const resumeVideo = data.flat_videos.find(v => !v.locked && !v.is_completed) || data.flat_videos[0];
        setActiveVideoId(resumeVideo.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, activeVideoId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchCourse();
    }
  }, [user, authLoading, fetchCourse, router]);

  const activeVideo = courseData?.flat_videos.find(v => v.id === activeVideoId);

  const handleVideoSelect = (video: Video) => {
    if (video.locked) return;
    setActiveVideoId(video.id);
  };

  const handleNextVideo = () => {
    if (activeVideo?.next_video_id) {
      const nextVid = courseData?.flat_videos.find(v => v.id === activeVideo.next_video_id);
      if (nextVid && !nextVid.locked) {
        setActiveVideoId(nextVid.id);
      }
    }
  };

  const handlePrevVideo = () => {
    if (activeVideo?.previous_video_id) {
      setActiveVideoId(activeVideo.previous_video_id);
    }
  };

  const handleMarkComplete = async () => {
    if (!activeVideo) return;
    try {
      await api.post(`/videos/${activeVideo.id}/progress`, {
        last_position_seconds: activeVideo.duration_seconds || 999999,
        duration_seconds: activeVideo.duration_seconds || 100,
      });
      fetchCourse();
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!courseData) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Course not found</p>
          <Link href="/subjects" className="mt-3 inline-block text-indigo-600 hover:text-indigo-700 text-sm">Back to courses</Link>
        </div>
      </div>
    );
  }

  if (!courseData.is_enrolled) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-lg mb-4">You need to enroll in this course first</p>
          <Link href={`/subjects/${id}`} className="inline-flex items-center px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700">
            Go to course page
          </Link>
        </div>
      </div>
    );
  }

  const youtubeId = activeVideo ? extractYoutubeId(activeVideo.youtube_url) : null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0">
        <Link href="/subjects" className="text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate">{courseData.subject.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${courseData.progress.percent}%` }} />
            </div>
            <span className="text-xs text-gray-500 font-medium">{courseData.progress.percent}%</span>
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 lg:hidden">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Video player */}
          <div className="bg-black">
            <div className="max-w-5xl mx-auto">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                {activeVideo && !activeVideo.locked && youtubeId ? (
                  <iframe
                    ref={playerRef}
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&start=${activeVideo.last_position_seconds || 0}&enablejsapi=1`}
                    title={activeVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : activeVideo?.locked ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      <p className="text-gray-400">{activeVideo.unlock_reason}</p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-400">
                    Select a video to start
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Video info */}
          {activeVideo && (
            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto w-full">
              <h2 className="text-xl font-semibold text-gray-900">{activeVideo.title}</h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={handlePrevVideo}
                  disabled={!activeVideo.previous_video_id}
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Previous
                </button>
                {!activeVideo.is_completed && (
                  <button
                    onClick={handleMarkComplete}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Mark Complete
                  </button>
                )}
                {activeVideo.is_completed && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Completed
                  </span>
                )}
                <button
                  onClick={handleNextVideo}
                  disabled={!activeVideo.next_video_id}
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-96 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0 fixed lg:relative inset-0 top-14 z-40 lg:z-auto`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Course Content</h3>
            <p className="text-xs text-gray-500 mt-1">
              {courseData.progress.completed} / {courseData.progress.total} completed
            </p>
            <div className="mt-2 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${courseData.progress.percent}%` }} />
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {courseData.sections.map(section => (
              <div key={section.id}>
                <div className="px-4 py-3 bg-gray-50/50">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{section.title}</h4>
                </div>
                <div>
                  {section.videos.map(video => (
                    <button
                      key={video.id}
                      onClick={() => handleVideoSelect(video)}
                      disabled={video.locked}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 ${
                        video.id === activeVideoId ? 'bg-indigo-50 border-l-2 border-indigo-600' : 'border-l-2 border-transparent'
                      } ${video.locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {video.is_completed ? (
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </div>
                        ) : video.locked ? (
                          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                          </div>
                        ) : (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            video.id === activeVideoId ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'
                          }`}>
                            {video.id === activeVideoId && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            )}
                          </div>
                        )}
                      </div>
                      <span className={`text-sm ${video.id === activeVideoId ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}>
                        {video.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
