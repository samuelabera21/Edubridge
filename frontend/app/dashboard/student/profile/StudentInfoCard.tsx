"use client";

import { UserCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { buildStudentProfileView } from "@/lib/student-profile";

export default function StudentInfoCard() {
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
        setError("We could not load your profile information.");
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
    return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error || "Student information is unavailable."}</section>;
  }

  const photoUrl = profile.photoUrl;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Student Information</h2>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#006b3f]">
          Read only
        </div>
      </div>

      <div className="mb-5 flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:flex-row">
        {photoUrl ? (
          <img src={photoUrl} alt={profile.fullName} className="h-20 w-20 rounded-full border-2 border-white object-cover shadow-sm" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-[#006b3f]">
            <UserCircle2 className="h-12 w-12" />
          </div>
        )}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Student</p>
          <p className="text-xl font-bold text-gray-900">{profile.fullName}</p>
          <p className="text-sm text-gray-600">{profile.studentId}</p>
        </div>
      </div>

      <div className="space-y-3 text-sm text-gray-700">
        {[
          ["Full name", profile.fullName],
          ["Student ID", profile.studentId],
          ["Date of birth", profile.dateOfBirth],
          ["Gender", profile.gender],
          ["Nationality", profile.nationality],
          ["Place of birth", profile.placeOfBirth],
          ["Father name", profile.fatherName],
          ["Grandfather name", profile.grandfatherName],
          ["Region", profile.region],
          ["Zone", profile.zone],
          ["Woreda", profile.woreda],
          ["City", profile.city],
          ["Kebele", profile.kebele],
          ["House number", profile.houseNumber],
          ["Previous school", profile.previousSchool],
          ["Previous student ID", profile.previousStudentId],
          ["Emergency contact", profile.emergencyContactName],
          ["Emergency relation", profile.emergencyContactRelation],
          ["Emergency phone", profile.emergencyContactPhone],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
            <span className="text-gray-500">{label}</span>
            <span className="max-w-[60%] text-right font-medium text-gray-900">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
