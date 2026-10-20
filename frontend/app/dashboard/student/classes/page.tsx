"use client";

import ClassesHeader from "./ClassesHeader";
import ClassScheduleCard from "./ClassScheduleCard";
import LearningResourcesCard from "./LearningResourcesCard";

export default function StudentClassesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      <ClassesHeader
        title="Class Schedule & Subjects"
        subtitle="Manage your daily academic schedule, enrolled subjects, and associated curriculum resources."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ClassScheduleCard />
        <LearningResourcesCard />
      </div>
    </div>
  );
}
