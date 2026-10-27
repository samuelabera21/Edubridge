"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, FileText, Sparkles, Tag } from "lucide-react";
import { fetchApi } from "../../../../lib/api";

type LearningActivity = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  dueDate: string | null;
  teachingAssignment: { subject: { name: string } };
};

export default function LearningResourcesCard() {
  const [activities, setActivities] = useState<LearningActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchApi("/student/dashboard")
      .then(async (response) => {
        if (!response.ok) throw new Error("Dashboard request failed");
        const data = await response.json();
        setActivities(Array.isArray(data.upcomingActivities) ? data.upcomingActivities : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Learning Resources</h2>
          </div>
          <Link
            href="/dashboard/student/resources/school"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <span>Full Library</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading learning materials...</p>
        ) : error ? (
          <p className="text-sm text-rose-600">Could not load learning activities.</p>
        ) : activities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500 space-y-2">
            <BookOpen className="h-6 w-6 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">Digital Library Ready</p>
            <p>Access national curriculum textbooks, worksheets, and course media in the library.</p>
            <Link
              href="/dashboard/student/resources/school"
              className="inline-block mt-1 font-bold text-blue-600 hover:underline text-xs"
            >
              Browse Curriculum Materials &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs text-slate-800 space-y-1 hover:border-blue-200 transition"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 truncate">{activity.title}</span>
                  <span className="bg-blue-100 text-[#184973] px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
                    {activity.teachingAssignment.subject.name}
                  </span>
                </div>
                {activity.description && (
                  <p className="text-slate-600 line-clamp-2">{activity.description}</p>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-blue-100/70 text-[10px] text-slate-500">
                  <span>Type: {activity.type}</span>
                  {activity.dueDate && (
                    <span>Due: {new Date(activity.dueDate).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
        <Link
          href="/dashboard/student/resources/school"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
        >
          <Sparkles className="h-4 w-4" />
          <span>Explore Textbooks, Guides &amp; Media</span>
        </Link>
        <Link
          href="/dashboard/student/learning/assignments"
          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          Assignments &rarr;
        </Link>
      </div>
    </section>
  );
}
