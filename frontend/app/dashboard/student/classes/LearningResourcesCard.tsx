"use client";

import { useEffect, useState } from "react";
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
        if (!response.ok) throw new Error("Activities request failed");
        const dashboard = await response.json();
        setActivities(dashboard.upcomingActivities || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Learning Resources</h2>
      {loading ? <p className="text-sm text-gray-500">Loading learning resources...</p> : error ? <p className="text-sm text-red-600">Could not load learning resources.</p> : activities.length === 0 ? <p className="text-sm text-gray-500">No learning resources are available yet.</p> : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <article key={activity.id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{activity.title}</h3>
                <span className="text-xs font-medium uppercase text-emerald-700">{activity.type}</span>
              </div>
              <p className="mt-1 text-emerald-800">{activity.teachingAssignment.subject.name}</p>
              {activity.description && <p className="mt-2 text-emerald-700">{activity.description}</p>}
              <p className="mt-2 text-xs text-emerald-700">{activity.dueDate ? `Due ${new Date(activity.dueDate).toLocaleDateString()}` : "No due date"}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
