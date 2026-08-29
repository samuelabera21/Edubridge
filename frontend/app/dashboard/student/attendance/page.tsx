import { ClipboardCheck } from "lucide-react";
import AttendanceHistoryCard from "./AttendanceHistoryCard";
import SubmitExplanationCard from "./SubmitExplanationCard";

export default function StudentAttendancePage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">My attendance</p>
          <h1 className="text-2xl font-bold text-gray-900">Attendance and Absence Records</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AttendanceHistoryCard />
        <SubmitExplanationCard />
      </div>
    </div>
  );
}
