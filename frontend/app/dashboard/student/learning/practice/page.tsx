"use client";

import { useEffect, useState } from "react";
import LearningHeader from "../LearningHeader";
import PracticeAndQuizzesCard from "../PracticeAndQuizzesCard";
import { fetchApi } from "@/lib/api";

export default function StudentPracticePage() {
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchApi("/student/learning/activities")
      .then(async (res) => {
        if (res.ok) {
          const acts = await res.json();
          if (Array.isArray(acts)) {
            const practiceOnly = acts.filter((a: any) => a.type === "PRACTICE" || a.type === "READING" || a.type === "LAB");
            setTotalCount(practiceOnly.length);
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      <LearningHeader
        title="Practice and Quizzes"
        subtitle="Self-paced speed drills, reading passages, and laboratory guides designed to reinforce core topics."
        totalActivities={totalCount}
      />

      <PracticeAndQuizzesCard />
    </div>
  );
}
