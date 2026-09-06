export default function LearningResourcesCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Learning Resources</h2>
      <div className="space-y-3">
        {[
          "Mathematics revision notes",
          "Science lab worksheet",
          "English reading comprehension pack",
        ].map((item) => (
          <div key={item} className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
