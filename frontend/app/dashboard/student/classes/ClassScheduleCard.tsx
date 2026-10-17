"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import { fetchApi } from "../../../../lib/api";

type DashboardClass = {
  id: string;
  dayOfWeek: number;
  classPeriod: { name: string; startTime: string; endTime: string };
  teachingAssignment: {
    subject: { name: string };
    teacher: { firstName: string; lastName: string };
  };
  room?: { name: string } | null;
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTeacherName(firstName?: string, lastName?: string) {
  const parts = [firstName, lastName].filter(Boolean);
  if (!parts.length) return "Teacher";
  return parts
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ""))
    .join(" ");
}

export default function ClassScheduleCard() {
  const [todayClasses, setTodayClasses] = useState<DashboardClass[]>([]);
  const [weeklyClasses, setWeeklyClasses] = useState<DashboardClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchApi("/student/dashboard")
      .then(async (response) => {
        if (!response.ok) throw new Error("Dashboard request failed");
        const data = await response.json();
        setTodayClasses(Array.isArray(data.todayClasses) ? data.todayClasses : []);
        setWeeklyClasses(Array.isArray(data.weeklyClasses) ? data.weeklyClasses : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const todayName = dayNames[new Date().getDay()];

  return (
    <section className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#006b3f]" />
            <h2 className="text-lg font-semibold text-gray-900">Class Schedule</h2>
          </div>
          <Link
            href="/dashboard/student/timetable"
            className="text-xs font-semibold text-[#006b3f] hover:underline"
          >
            Full Timetable →
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading schedule...</p>
        ) : error ? (
          <p className="text-sm text-red-600">Could not load schedule.</p>
        ) : todayClasses.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Today&apos;s Classes ({todayName})</p>
            {todayClasses.map((item) => (
              <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-gray-900">{item.teachingAssignment.subject.name}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {item.classPeriod.startTime} - {item.classPeriod.endTime}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {item.classPeriod.name} · Teacher: {formatTeacherName(item.teachingAssignment.teacher.firstName, item.teachingAssignment.teacher.lastName)}
                  {item.room?.name ? ` · Room ${item.room.name}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3.5 text-sm text-emerald-900">
              <p className="font-semibold">No classes scheduled today ({todayName}).</p>
              <p className="mt-0.5 text-xs text-emerald-700">Preview of your weekly scheduled periods:</p>
            </div>

            {weeklyClasses.length > 0 ? (
              <div className="space-y-2">
                {weeklyClasses.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          {dayNames[item.dayOfWeek] || `Day ${item.dayOfWeek}`}
                        </span>
                        <span className="font-semibold text-gray-900">{item.teachingAssignment.subject.name}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Teacher: {formatTeacherName(item.teachingAssignment.teacher.firstName, item.teachingAssignment.teacher.lastName)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-600 font-medium">
                      <div>{item.classPeriod.name}</div>
                      <div className="text-gray-400">{item.classPeriod.startTime}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No classes scheduled for this week yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <Link
          href="/dashboard/student/timetable"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#006b3f] hover:underline"
        >
          <Clock className="h-4 w-4" />
          View full interactive weekly timetable
        </Link>
      </div>
    </section>
  );
}
