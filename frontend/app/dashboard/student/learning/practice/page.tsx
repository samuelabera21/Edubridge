import { ArrowLeft, BrainCircuit } from "lucide-react";
import Link from "next/link";
import PracticeAndQuizzesCard from "../PracticeAndQuizzesCard";

export default function StudentPracticePage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-2 text-[#006b3f]">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#006b3f]">My learning</p>
            <h1 className="text-2xl font-bold text-gray-900">Practice and Quizzes</h1>
          </div>
        </div>
        <Link href="/dashboard/student" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <PracticeAndQuizzesCard />
    </div>
  );
}
