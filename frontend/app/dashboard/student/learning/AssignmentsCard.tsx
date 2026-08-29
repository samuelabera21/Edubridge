export default function AssignmentsCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Assignments</h2>
      <div className="space-y-3 text-sm">
        {[
          { title: "Worksheet: Fractions", due: "Due 2 Sep" },
          { title: "Essay draft: My community", due: "Due 4 Sep" },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-gray-900">{item.title}</p>
              <span className="text-xs font-semibold text-orange-700">Open</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">{item.due}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
