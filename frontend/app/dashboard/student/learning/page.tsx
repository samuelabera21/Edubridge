"use client";

import { useEffect, useState } from "react";
import LearningHeader from "./LearningHeader";
import AssignmentsCard from "./AssignmentsCard";
import PracticeAndQuizzesCard from "./PracticeAndQuizzesCard";
import { fetchApi } from "@/lib/api";

export default function StudentLearningPage() {
  const [totalCount, setTotalCount] = useState(0);
  const [subCount, setSubCount] = useState(0);

  useEffect(() => {
    async function loadCounts() {
      try {
        const [actRes, subRes] = await Promise.all([
          fetchApi("/student/learning/activities").catch(() => null),
          fetchApi("/student/learning/submissions").catch(() => null),
        ]);
        if (actRes && actRes.ok) {
          const acts = await actRes.json();
          if (Array.isArray(acts)) setTotalCount(acts.length);
        }
        if (subRes && subRes.ok) {
          const subs = await subRes.json();
          if (Array.isArray(subs)) setSubCount(subs.length);
        }
      } catch {
        // silent
      }
    }
    loadCounts();
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      <LearningHeader
        title="My Learning Activities"
        subtitle="Manage daily curriculum assignments, laboratory reports, and skill-reinforcement practice drills."
        totalActivities={totalCount}
        submittedCount={subCount}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AssignmentsCard />
        <PracticeAndQuizzesCard />
      </div>
    </div>
  );
}
