"use client";

import { useEffect, useState } from "react";
import LearningHeader from "../LearningHeader";
import AssignmentsCard from "../AssignmentsCard";
import { fetchApi } from "@/lib/api";

export default function StudentAssignmentsPage() {
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchApi("/student/learning/activities")
      .then(async (res) => {
        if (res.ok) {
          const acts = await res.json();
          if (Array.isArray(acts)) {
            const homeworkOnly = acts.filter((a: any) => a.type !== "PRACTICE" && a.type !== "READING" && a.type !== "LAB");
            setTotalCount(homeworkOnly.length);
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      <LearningHeader
        title="Assignments"
        subtitle="Current homework, writing tasks, and curriculum problem sets assigned by your subject instructors."
        totalActivities={totalCount}
      />

      <AssignmentsCard />
    </div>
  );
}
