export default function TestsAndQuizzesCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Tests and Quizzes</h2>
      <div className="space-y-3 text-sm">
        {[
          { title: "Math Quiz 1", date: "Tue 3 Sep" },
          { title: "Science Revision Test", date: "Thu 5 Sep" },
          { title: "English Comprehension Quiz", date: "Mon 9 Sep" },
        ].map((item) => (
          <div key={item.title} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div>
              <p className="font-medium text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-500">{item.date}</p>
            </div>
            <button className="rounded-lg bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700">
              Start
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
