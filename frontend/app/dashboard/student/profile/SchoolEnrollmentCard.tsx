"use client";

import { Building2, CalendarClock, School, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { buildStudentProfileView } from "@/lib/student-profile";

export default function SchoolEnrollmentCard() {
  const [profile, setProfile] = useState<ReturnType<typeof buildStudentProfileView> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetchApi("/student/me");
        if (!response.ok) throw new Error("Profile request failed");
        const data = await response.json();
        setProfile(buildStudentProfileView(data));
      } catch {
        setError("We could not load your school and enrollment details.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) {
    return <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><div className="animate-pulse space-y-3"><div className="h-4 w-24 rounded bg-gray-200" /><div className="h-10 rounded bg-gray-100" /><div className="h-10 rounded bg-gray-100" /><div className="h-10 rounded bg-gray-100" /></div></section>;
  }

  if (error || !profile) {
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error || "School and enrollment details are unavailable."}</section>;
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">School and Enrollment</h2>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">Locked</span>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-emerald-50/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-[#006b3f]">
            <Building2 className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-[0.15em]">School</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{profile.schoolName}</p>
          <p className="mt-1 text-sm text-gray-600">{profile.schoolAddress}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-700">
            <span>{profile.schoolEmail}</span>
            <span>•</span>
            <span>{profile.schoolPhone}</span>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          {[
            ["Grade", profile.gradeName],
            ["Section", profile.sectionName],
            ["Academic year", profile.academicYear],
            ["Enrollment status", profile.enrollmentStatus],
            ["Enrollment date", profile.enrollmentDate],
            ["School contact email", profile.schoolEmail],
            ["School phone", profile.schoolPhone],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
              <span className="text-gray-500">{label}</span>
              <span className="max-w-[60%] text-right font-medium text-gray-900">{value}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <School className="mt-0.5 h-4 w-4 text-[#006b3f]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Current grade</p>
              <p className="font-semibold text-gray-900">{profile.gradeName}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-4 w-4 text-[#006b3f]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Academic year</p>
              <p className="font-semibold text-gray-900">{profile.academicYear}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 sm:col-span-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-[#006b3f]" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Status</p>
              <p className="font-semibold text-gray-900">{profile.enrollmentStatus}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
