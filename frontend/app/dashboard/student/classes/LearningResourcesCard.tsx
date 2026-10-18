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
        if (!response.ok) throw new Error("Dashboard request failed");
        const data = await response.json();
        setActivities(Array.isArray(data.upcomingActivities) ? data.upcomingActivities : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Learning Resources and Activities</h2>
      {loading ? <p className="text-sm text-gray-500">Loading learning activities...</p> : error ? <p className="text-sm text-red-600">Could not load learning activities.</p> : activities.length === 0 ? <p className="text-sm text-gray-500">No learning activities are available yet.</p> : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
              <p className="font-semibold">{activity.title}</p>
              <p className="mt-1">{activity.teachingAssignment.subject.name} · {activity.type}</p>
              {activity.dueDate && <p className="mt-1 text-xs">Due {new Date(activity.dueDate).toLocaleDateString()}</p>}
              {activity.description && <p className="mt-1 text-xs text-emerald-700">{activity.description}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
