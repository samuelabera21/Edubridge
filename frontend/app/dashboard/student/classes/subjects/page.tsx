"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, Mail, Phone, UserRound } from "lucide-react";
import { fetchApi } from "../../../../../lib/api";

type SubjectItem = {
  id: string;
  subject: {
    id?: string;
    name: string;
    code?: string;
  };
  teacher: {
    id?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
  };
  periodsPerWeek?: number;
  section?: { id: string; name: string } | null;
};

function formatTeacherName(firstName?: string, lastName?: string) {
  const parts = [firstName, lastName].filter(Boolean);
  if (!parts.length) return "Assigned Teacher";
  return parts
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ""))
    .join(" ");
}

export default function StudentSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const dashboardResponse = await fetchApi("/student/dashboard");
        if (!dashboardResponse.ok) throw new Error("Dashboard request failed");
        const dashboard = await dashboardResponse.json();

        if (Array.isArray(dashboard.subjects) && dashboard.subjects.length > 0) {
          setSubjects(dashboard.subjects);
        } else if (Array.isArray(dashboard.weeklyClasses)) {
          const map = new Map<string, SubjectItem>();
          dashboard.weeklyClasses.forEach((entry: {
            id: string;
            teachingAssignment: {
              subject: { id?: string; name: string; code?: string };
              teacher: { id?: string; firstName: string; lastName: string; email?: string; phoneNumber?: string };
              periodsPerWeek?: number;
              section?: { id: string; name: string } | null;
            };
          }) => {
            const ta = entry.teachingAssignment;
            if (ta && ta.subject && !map.has(ta.subject.name)) {
              map.set(ta.subject.name, {
                id: entry.id,
                subject: ta.subject,
                teacher: ta.teacher,
                periodsPerWeek: ta.periodsPerWeek,
                section: ta.section
              });
            }
          });
          setSubjects(Array.from(map.values()));
        } else {
          setSubjects([]);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadSubjects();
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <header className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">My classes</p>
            <h1 className="text-2xl font-bold text-gray-900">Subjects and Teachers</h1>
          </div>
        </header>

        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      {loading ? (
        <Message text="Loading subjects and teachers..." />
      ) : error ? (
        <Message text="Could not load your subjects and teachers." />
      ) : subjects.length === 0 ? (
        <Message text="No subjects are assigned to your section yet." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {subjects.map((item) => (
            <section
              key={item.id || item.subject.name}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-200 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-gray-900">{item.subject.name}</h2>
                  {item.subject.code && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                      {item.subject.code}
                    </span>
                  )}
                </div>

                {item.section?.name && (
                  <p className="mt-1 text-xs text-gray-400">Section {item.section.name}</p>
                )}
              </div>

              <div className="mt-6 border-t border-gray-100 pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                    {item.teacher.firstName ? item.teacher.firstName.charAt(0).toUpperCase() : <UserRound className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      {formatTeacherName(item.teacher.firstName, item.teacher.lastName)}
                    </p>
                    <p className="text-xs text-gray-500">Subject Teacher</p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 text-xs text-gray-600">
                  {item.periodsPerWeek ? (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span>{item.periodsPerWeek} periods per week</span>
                    </div>
                  ) : null}
                  {item.teacher.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate">{item.teacher.email}</span>
                    </div>
                  )}
                  {item.teacher.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>{item.teacher.phoneNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Message({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">
      {text}
    </div>
  );
}