"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";

type DashboardClass = {
  id: string;
  dayOfWeek: number;
  classPeriod: { startTime: string; endTime: string };
  teachingAssignment: {
    subject: { name: string };
    teacher: { firstName: string; lastName: string };
  };
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ClassScheduleCard() {
  const [classes, setClasses] = useState<DashboardClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchApi("/student/dashboard")
      .then(async (response) => {
        if (!response.ok) throw new Error("Dashboard request failed");
        const data = await response.json();
        setClasses(Array.isArray(data.todayClasses) ? data.todayClasses : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Today&apos;s Class Schedule</h2>
      {loading ? <p className="text-sm text-gray-500">Loading today&apos;s classes...</p> : error ? <p className="text-sm text-red-600">Could not load today&apos;s classes.</p> : classes.length === 0 ? <p className="text-sm text-gray-500">No classes are scheduled today.</p> : (
        <div className="space-y-3">
          {classes.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-gray-900">{item.teachingAssignment.subject.name}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.classPeriod.startTime} - {item.classPeriod.endTime}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{dayNames[item.dayOfWeek]} · Teacher: {item.teachingAssignment.teacher.firstName} {item.teachingAssignment.teacher.lastName}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
