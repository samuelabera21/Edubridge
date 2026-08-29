export default function SubmitExplanationCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Submit Explanation</h2>
      <div className="space-y-4">
        <textarea
          rows={5}
          placeholder="Write your explanation for an absence or lateness..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 outline-none ring-0 placeholder:text-gray-400"
        />
        <button className="rounded-xl bg-[#006b3f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005334]">
          Submit explanation
        </button>
      </div>
    </section>
  );
}
