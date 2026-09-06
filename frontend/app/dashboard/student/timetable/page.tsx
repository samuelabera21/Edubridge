"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, MapPin, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchApi } from "../../../../lib/api";

type StudentDashboardData = {
  student: { studentId: string; name: string };
  enrollment: {
    academicYear: { id: string; name: string };
    schoolGrade: { grade: { name: string } };
    section: { id: string; name: string } | null;
  };
};

type TimetableEntry = {
  id: string;
  dayOfWeek: number;
  classPeriod: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
  teachingAssignment: {
    subject: { name: string };
    teacher: { firstName: string; lastName: string };
    section: { name: string } | null;
  };
  room: { name: string; description: string | null; status: string } | null;
};

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const schoolDays = [1, 2, 3, 4, 5];

function parseTimeToMinutes(value: string) {
  if (!value) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getStatus(entry: TimetableEntry) {
  const now = new Date();
  const currentDay = now.getDay();
  const isToday = entry.dayOfWeek === currentDay;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(entry.classPeriod.startTime);
  const endMinutes = parseTimeToMinutes(entry.classPeriod.endTime);

  if (isToday && nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
    return "In progress";
  }

  if (isToday && nowMinutes > endMinutes) {
    return "Completed";
  }

  if (isToday && nowMinutes < startMinutes) {
    return "Upcoming";
  }

  return "Scheduled";
}

export default function StudentTimetablePage() {
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);

  useEffect(() => {
    async function loadTimetable() {
      try {
        const dashboardRes = await fetchApi("/student/dashboard");
        if (!dashboardRes.ok) throw new Error("Student dashboard request failed");

        const dashboardData: StudentDashboardData = await dashboardRes.json();
        setDashboard(dashboardData);

        const sectionId = dashboardData.enrollment?.section?.id;
        if (!sectionId) {
          setTimetable([]);
          return;
        }

        const timetableRes = await fetchApi(`/timetable/section/${sectionId}?academicYearId=${dashboardData.enrollment.academicYear.id}`);
        if (!timetableRes.ok) throw new Error("Timetable request failed");

        const timetableData = await timetableRes.json();
        setTimetable(Array.isArray(timetableData) ? timetableData : []);
      } catch (err) {
        console.error(err);
        setError("We could not load your timetable right now.");
      } finally {
        setLoading(false);
      }
    }

    loadTimetable();
  }, []);

  const periodRows = useMemo(() => {
    const rows = Array.from(
      new Map(
        timetable.map((entry) => [entry.classPeriod.id, entry.classPeriod])
      ).values()
    ).sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

    return rows;
  }, [timetable]);

  const gridByDay = useMemo(() => {
    const map = new Map<number, Map<string, TimetableEntry>>();
    schoolDays.forEach((day) => map.set(day, new Map()));

    timetable.forEach((entry) => {
      if (!map.has(entry.dayOfWeek)) return;
      map.get(entry.dayOfWeek)?.set(entry.classPeriod.id, entry);
    });

    return map;
  }, [timetable]);

  const todayDay = new Date().getDay();
  const activeDay = schoolDays.includes(todayDay) ? todayDay : null;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl animate-pulse rounded-2xl border border-gray-200 bg-white p-8 text-gray-500 shadow-sm">
        Loading timetable...
      </div>
    );
  }

  const sectionName = dashboard?.enrollment?.section?.name ?? "Section not assigned";
  const gradeName = dashboard?.enrollment?.schoolGrade?.grade?.name ?? "Grade";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">My timetable</p>
            <h1 className="text-2xl font-bold text-gray-900">Weekly class schedule</h1>
          </div>
        </div>

        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Student schedule</p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">{dashboard?.student?.name || "Student"}</h2>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-emerald-800">
            <span className="rounded-full bg-white px-3 py-1 font-medium">{gradeName}</span>
            <span className="rounded-full bg-white px-3 py-1 font-medium">{sectionName}</span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : periodRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
          No timetable entries are assigned for this section yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-r border-gray-200 p-3 text-xs font-bold uppercase tracking-wide text-gray-500">
                  Period
                </th>
                {schoolDays.map((day) => {
                  const isToday = activeDay === day;
                  return (
                    <th
                      key={day}
                      className={`border-b border-gray-200 p-3 text-center text-xs font-bold uppercase tracking-wide ${
                        isToday ? "bg-emerald-50 text-emerald-700" : "text-gray-600"
                      }`}
                    >
                      <div>{dayNames[day - 1]}</div>
                      {isToday && <div className="mt-1 text-[10px] font-semibold">Today</div>}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {periodRows.map((period) => (
                <tr key={period.id} className="align-top">
                  <th className="border-r border-gray-200 bg-gray-50 p-3 align-top text-left">
                    <div className="font-bold text-gray-900">{period.name}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {period.startTime} - {period.endTime}
                    </div>
                  </th>

                  {schoolDays.map((day) => {
                    const entry = gridByDay.get(day)?.get(period.id) ?? null;
                    const isToday = activeDay === day;
                    const isCurrentClass = entry ? getStatus(entry) === "In progress" : false;

                    return (
                      <td
                        key={`${day}-${period.id}`}
                        className={`border-l border-gray-200 p-2 align-top ${
                          isToday ? "bg-emerald-50/60" : "bg-white"
                        } ${isCurrentClass ? "ring-2 ring-emerald-300" : ""}`}
                      >
                        {entry ? (
                          <button
                            type="button"
                            onClick={() => setSelectedEntry(entry)}
                            className={`w-full rounded-xl border p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50 ${
                              isCurrentClass
                                ? "border-emerald-300 bg-emerald-100/60"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                                {entry.teachingAssignment.subject.name}
                              </span>
                              {isCurrentClass && (
                                <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                  Now
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-sm font-semibold text-gray-900">
                              {entry.teachingAssignment.teacher.firstName} {entry.teachingAssignment.teacher.lastName}
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                              <MapPin className="h-3.5 w-3.5 text-gray-400" />
                              <span>{entry.room?.name || "Room TBD"}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-500">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              <span>{entry.classPeriod.startTime} - {entry.classPeriod.endTime}</span>
                            </div>
                          </button>
                        ) : (
                          <div className="flex min-h-[96px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 p-2 text-center text-[11px] text-gray-400">
                            Free period
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Class details</p>
                <h3 className="mt-2 text-2xl font-bold text-gray-900">{selectedEntry.teachingAssignment.subject.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-100"
                aria-label="Close details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>
                  {dayNames[selectedEntry.dayOfWeek - 1]} · {selectedEntry.classPeriod.startTime} - {selectedEntry.classPeriod.endTime}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{selectedEntry.room?.name || "Room TBD"}</span>
              </div>

              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Teacher</p>
                <p className="mt-1 font-medium text-gray-900">
                  {selectedEntry.teachingAssignment.teacher.firstName} {selectedEntry.teachingAssignment.teacher.lastName}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Status</p>
                <p className="mt-1 font-medium text-gray-900">{getStatus(selectedEntry)}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Section</p>
                <p className="mt-1 font-medium text-gray-900">
                  {selectedEntry.teachingAssignment.section?.name ? `${selectedEntry.teachingAssignment.section.name}` : "Section assignment"}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-[#006b3f] px-3 py-2 text-sm font-medium text-white hover:bg-[#005632]"
                onClick={() => setSelectedEntry(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setSelectedEntry(null)}
              >
                Message teacher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
