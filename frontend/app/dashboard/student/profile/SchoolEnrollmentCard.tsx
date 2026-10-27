"use client";

import Link from "next/link";
import { Building2, CalendarClock, ChevronRight, FileText, School, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { buildStudentProfileView, type StudentProfileView } from "@/lib/student-profile";

export default function SchoolEnrollmentCard() {
  const [profile, setProfile] = useState<StudentProfileView | null>(null);
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
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-10 rounded bg-gray-100" />
          <div className="h-10 rounded bg-gray-100" />
          <div className="h-10 rounded bg-gray-100" />
        </div>
      </section>
    );
  }

  if (error || !profile) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        {error || "School and enrollment details are unavailable."}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">School and Enrollment</h2>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">
          Locked
        </span>
      </div>

      <div className="space-y-4">
        <div className="group rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 transition-all duration-300 hover:border-[#4085b3] hover:shadow-xs">
          <div className="mb-2 flex items-center gap-2 text-[#184973]">
            <Building2 className="h-4 w-4" />
            <span className="text-sm font-semibold uppercase tracking-[0.15em]">School</span>
          </div>
          <p className="text-xl font-bold text-gray-900 group-hover:text-[#4085b3] transition-colors">{profile.schoolName}</p>
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

        <div className="grid gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2">
          <div className="group/item flex items-start gap-3 rounded-xl border border-transparent p-2.5 transition-all duration-200 hover:border-[#4085b3] hover:bg-white hover:shadow-2xs">
            <School className="mt-0.5 h-4 w-4 text-[#184973] group-hover/item:text-[#4085b3] transition-colors" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Current grade</p>
              <p className="font-semibold text-gray-900 group-hover/item:text-[#4085b3] transition-colors">{profile.gradeName}</p>
            </div>
          </div>
          <div className="group/item flex items-start gap-3 rounded-xl border border-transparent p-2.5 transition-all duration-200 hover:border-[#4085b3] hover:bg-white hover:shadow-2xs">
            <CalendarClock className="mt-0.5 h-4 w-4 text-[#184973] group-hover/item:text-[#4085b3] transition-colors" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Academic year</p>
              <p className="font-semibold text-gray-900 group-hover/item:text-[#4085b3] transition-colors">{profile.academicYear}</p>
            </div>
          </div>
          <div className="group/item flex items-start gap-3 rounded-xl border border-transparent p-2.5 transition-all duration-200 hover:border-[#4085b3] hover:bg-white hover:shadow-2xs sm:col-span-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-[#184973] group-hover/item:text-[#4085b3] transition-colors" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Status</p>
              <p className="font-semibold text-gray-900 group-hover/item:text-[#4085b3] transition-colors">{profile.enrollmentStatus}</p>
            </div>
          </div>
        </div>

        {/* Admission Documents Link & Count */}
        <div className="group flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs transition-all duration-300 hover:border-[#4085b3] hover:bg-white hover:shadow-xs">
          <div className="flex items-center gap-2 text-[#184973]">
            <FileText className="h-4 w-4 shrink-0 text-[#184973]" />
            <div>
              <span className="font-bold">Official Intake Files: </span>
              <span className="font-medium text-slate-700">
                {profile.documents?.length > 0
                  ? `${profile.documents.length} verified documents`
                  : "Documents registered"}
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/student/profile/documents"
            className="inline-flex items-center gap-1 font-bold text-[#184973] group-hover:text-[#4085b3] hover:underline shrink-0 transition-colors"
          >
            <span>View Files</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
