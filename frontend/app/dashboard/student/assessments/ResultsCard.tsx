export default function ResultsCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Results and Feedback</h2>
      <div className="space-y-3 text-sm">
        {[
          { subject: "Mathematics", score: "88%", feedback: "Strong problem solving" },
          { subject: "Science", score: "91%", feedback: "Excellent effort" },
          { subject: "English", score: "84%", feedback: "Good comprehension" },
        ].map((item) => (
          <div key={item.subject} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{item.subject}</span>
              <span className="text-base font-bold text-[#006b3f]">{item.score}</span>
            </div>
            <p className="mt-1 text-xs text-gray-600">{item.feedback}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
