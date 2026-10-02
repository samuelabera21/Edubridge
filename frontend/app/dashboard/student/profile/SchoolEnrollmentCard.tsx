"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";

type Enrollment = {
  status: string;
  enrollmentDate: string;
  academicYear: { name: string };
  schoolGrade: { grade: { name: string } };
  section: { name: string } | null;
  organization: { name: string };
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function SchoolEnrollmentCard() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchApi("/student/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("Enrollment request failed");
        const student = await response.json();
        setEnrollment(student.enrollments?.[0] || null);
      })
      .catch(() => setError(true));
  }, []);

  if (error) return <EnrollmentMessage text="Could not load school and enrollment information." />;
  if (!enrollment) return <EnrollmentMessage text="Loading school and enrollment information..." />;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">School and Enrollment</h2>
      <div className="space-y-3 text-sm text-gray-700">
        <Detail label="School" value={enrollment.organization.name} />
        <Detail label="Grade" value={enrollment.schoolGrade.grade.name} />
        <Detail label="Section" value={enrollment.section?.name || "Not assigned"} />
        <Detail label="Academic year" value={enrollment.academicYear.name} />
        <Detail label="Enrollment date" value={formatDate(enrollment.enrollmentDate)} />
        <Detail label="Enrollment status" value={enrollment.status} />
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

function EnrollmentMessage({ text }: { text: string }) {
  return <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">{text}</section>;
}
