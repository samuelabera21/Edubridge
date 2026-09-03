export default function ClassScheduleCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Class Schedule</h2>
      <div className="space-y-3">
        {[
          { time: "08:00 - 08:45", subject: "Mathematics", teacher: "Mr. Osei" },
          { time: "08:45 - 09:30", subject: "English", teacher: "Mrs. Kumi" },
          { time: "09:45 - 10:30", subject: "Science", teacher: "Mr. Ali" },
        ].map((item) => (
          <div key={item.subject} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-gray-900">{item.subject}</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.time}</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">Teacher: {item.teacher}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
