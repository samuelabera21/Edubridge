"use client";

import { useEffect, useState } from "react";
import { BookOpen, UserRound } from "lucide-react";
import { fetchApi } from "../../../../../lib/api";

type TimetableEntry = {
  teachingAssignment: {
    subject: { name: string };
    teacher: { firstName: string; lastName: string };
  };
};

export default function StudentSubjectsPage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const dashboardResponse = await fetchApi("/student/dashboard");
        if (!dashboardResponse.ok) throw new Error("Dashboard request failed");
        const dashboard = await dashboardResponse.json();
        const sectionId = dashboard.enrollment?.section?.id;
        const academicYearId = dashboard.enrollment?.academicYear?.id;

        if (!sectionId || !academicYearId) {
          setEntries([]);
          return;
        }

        const timetableResponse = await fetchApi(`/timetable/section/${sectionId}?academicYearId=${academicYearId}`);
        if (!timetableResponse.ok) throw new Error("Subjects request failed");
        setEntries(await timetableResponse.json());
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadSubjects();
  }, []);

  const subjects = Array.from(
    new Map(entries.map((entry) => [entry.teachingAssignment.subject.name, entry.teachingAssignment])).values()
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <header className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-100 p-2 text-blue-700"><BookOpen className="h-5 w-5" /></div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">My classes</p>
          <h1 className="text-2xl font-bold text-gray-900">Subjects and Teachers</h1>
        </div>
      </header>

      {loading ? <Message text="Loading subjects and teachers..." /> : error ? <Message text="Could not load your subjects and teachers." /> : subjects.length === 0 ? <Message text="No subjects are assigned to your section yet." /> : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((assignment) => (
            <section key={assignment.subject.name} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{assignment.subject.name}</h2>
              <p className="mt-3 flex items-center gap-2 text-sm text-gray-600"><UserRound className="h-4 w-4 text-blue-600" />{assignment.teacher.firstName} {assignment.teacher.lastName}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Message({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">{text}</div>;
}