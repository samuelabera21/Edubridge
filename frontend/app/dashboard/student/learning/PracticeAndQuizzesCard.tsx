export default function PracticeAndQuizzesCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Practice and Quizzes</h2>
      <div className="space-y-3 text-sm">
        {[
          { title: "Math drill: Multiplication", status: "Ready" },
          { title: "Science recap quiz", status: "New" },
          { title: "Vocabulary challenge", status: "Ready" },
        ].map((item) => (
          <div key={item.title} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
            <span className="font-medium text-gray-900">{item.title}</span>
            <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
