"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";

type AttendanceRecord = {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks: string | null;
  classPeriod: { name: string } | null;
};

const statusLabels: Record<AttendanceRecord["status"], string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
};

export default function AttendanceHistoryCard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchApi("/student/attendance")
      .then(async (response) => {
        if (!response.ok) throw new Error("Attendance request failed");
        const data = await response.json();
        setRecords(Array.isArray(data) ? data : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Attendance History</h2>
      {loading ? <p className="text-sm text-gray-500">Loading attendance history...</p> : error ? <p className="text-sm text-red-600">Could not load attendance history.</p> : records.length === 0 ? <p className="text-sm text-gray-500">No attendance records have been recorded yet.</p> : <div className="space-y-3 text-sm">
        {records.map((record) => (
          <div key={record.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div>
              <p className="font-medium text-gray-700">{new Date(record.date).toLocaleDateString()}</p>
              <p className="text-xs text-gray-500">{record.classPeriod?.name || "Daily attendance"}{record.remarks ? ` · ${record.remarks}` : ""}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${record.status === "ABSENT" ? "bg-red-100 text-red-700" : record.status === "LATE" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
              {statusLabels[record.status]}
            </span>
          </div>
        ))}
      </div>}
    </section>
  );
}
