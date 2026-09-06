import { BarChart3 } from "lucide-react";
import ResultsCard from "./ResultsCard";
import TestsAndQuizzesCard from "./TestsAndQuizzesCard";

export default function StudentAssessmentsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">My assessments</p>
          <h1 className="text-2xl font-bold text-gray-900">Tests, Results and Feedback</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TestsAndQuizzesCard />
        <ResultsCard />
      </div>
    </div>
  );
}
