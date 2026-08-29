import { BookOpen } from "lucide-react";
import ClassScheduleCard from "./ClassScheduleCard";
import LearningResourcesCard from "./LearningResourcesCard";

export default function StudentClassesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">My classes</p>
          <h1 className="text-2xl font-bold text-gray-900">Class Schedule and Subjects</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ClassScheduleCard />
        <LearningResourcesCard />
      </div>
    </div>
  );
}
