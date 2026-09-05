import { GraduationCap } from "lucide-react";
import StudentInfoCard from "../StudentInfoCard";

export default function StudentInformationPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-100 p-2 text-[#006b3f]">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#006b3f]">Student profile</p>
          <h1 className="text-2xl font-bold text-gray-900">Student Information</h1>
        </div>
      </div>

      <StudentInfoCard />
    </div>
  );
}