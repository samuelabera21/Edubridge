import { BookOpen } from "lucide-react";
import LearningResourcesCard from "../LearningResourcesCard";

export default function StudentResourcesPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <header className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><BookOpen className="h-5 w-5" /></div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">My classes</p>
          <h1 className="text-2xl font-bold text-gray-900">Learning Resources</h1>
        </div>
      </header>

      <LearningResourcesCard />
    </div>
  );
}