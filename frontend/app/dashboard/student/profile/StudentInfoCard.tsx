"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";

type StudentProfile = {
  firstName: string;
  lastName: string;
  studentId: string;
  dateOfBirth: string | null;
  gender: string | null;
  fatherName: string | null;
  grandfatherName: string | null;
  emergencyContactName: string | null;
  emergencyContactRelation: string | null;
  emergencyContactPhone: string | null;
  region: string | null;
  zone: string | null;
  woreda: string | null;
  city: string | null;
  kebele: string | null;
  houseNumber: string | null;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not provided";
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value || "Not provided"}</span>
    </div>
  );
}

export default function StudentInfoCard() {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchApi("/student/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("Profile request failed");
        setStudent(await response.json());
      })
      .catch(() => setError(true));
  }, []);

  if (error) return <ProfileMessage text="Could not load student information." />;
  if (!student) return <ProfileMessage text="Loading student information..." />;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Student Information</h2>
      <div className="space-y-3 text-sm text-gray-700">
        <Detail label="Full name" value={`${student.firstName} ${student.lastName}`} />
        <Detail label="Student ID" value={student.studentId} />
        <Detail label="Date of birth" value={formatDate(student.dateOfBirth)} />
        <Detail label="Gender" value={student.gender} />
        <Detail label="Father's name" value={student.fatherName} />
        <Detail label="Grandfather's name" value={student.grandfatherName} />
        <Detail label="Address" value={[student.city, student.region, student.zone, student.woreda, student.kebele, student.houseNumber].filter(Boolean).join(", ")} />
        <Detail label="Emergency contact" value={[student.emergencyContactName, student.emergencyContactRelation, student.emergencyContactPhone].filter(Boolean).join(" - ")} />
      </div>
    </section>
  );
}

function ProfileMessage({ text }: { text: string }) {
  return <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">{text}</section>;
}
