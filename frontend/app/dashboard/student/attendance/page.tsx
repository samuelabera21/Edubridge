"use client";

import { useEffect, useState } from "react";
import AttendanceHeader from "./AttendanceHeader";
import AttendanceHistoryCard, { AttendanceRecord } from "./AttendanceHistoryCard";
import { fetchApi } from "../../../../lib/api";

export default function StudentAttendancePage() {
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [unexcusedCount, setUnexcusedCount] = useState<number>(0);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetchApi("/student/attendance");
        if (res.ok) {
          const records: AttendanceRecord[] = await res.json();
          if (Array.isArray(records)) {
            setTotalRecords(records.length);
            const present = records.filter((r) => r.status === "PRESENT").length;
            const late = records.filter((r) => r.status === "LATE").length;
            const excused = records.filter((r) => r.status === "EXCUSED").length;
            const absent = records.filter((r) => r.status === "ABSENT").length;
            setUnexcusedCount(absent);

            if (records.length > 0) {
              setAttendanceRate(Math.round(((present + late + excused) / records.length) * 100));
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadSummary();
  }, []);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-2 sm:p-4">
      <AttendanceHeader
        title="Attendance History & Calendar"
        subtitle="Track your daily attendance records, standing metrics, and period remarks."
        attendanceRate={attendanceRate}
        totalRecords={totalRecords}
        unexcusedCount={unexcusedCount}
      />

      <AttendanceHistoryCard />
    </div>
  );
}
