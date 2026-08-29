export default function AttendanceHistoryCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Attendance History</h2>
      <div className="space-y-3 text-sm">
        {[
          { date: "Mon, 26 Aug", status: "Present" },
          { date: "Tue, 27 Aug", status: "Present" },
          { date: "Wed, 28 Aug", status: "Absent" },
          { date: "Thu, 29 Aug", status: "Present" },
        ].map((item) => (
          <div key={item.date} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
            <span className="text-gray-700">{item.date}</span>
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === "Present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
