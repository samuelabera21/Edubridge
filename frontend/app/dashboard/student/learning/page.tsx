import { Activity } from "lucide-react";
import AssignmentsCard from "./AssignmentsCard";
import PracticeAndQuizzesCard from "./PracticeAndQuizzesCard";

export default function StudentLearningPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-orange-100 p-2 text-orange-700">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700">My learning</p>
          <h1 className="text-2xl font-bold text-gray-900">Assignments and Practice Activities</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AssignmentsCard />
        <PracticeAndQuizzesCard />
      </div>
    </div>
  );
}
