export default function SchoolEnrollmentCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">School and Enrollment</h2>
      <div className="space-y-3 text-sm text-gray-700">
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="text-gray-500">School</span>
          <span className="font-medium text-gray-900">EduBridge Academy</span>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="text-gray-500">Grade</span>
          <span className="font-medium text-gray-900">Grade 5</span>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="text-gray-500">Section</span>
          <span className="font-medium text-gray-900">Section A</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Academic year</span>
          <span className="font-medium text-gray-900">2026/2027</span>
        </div>
      </div>
    </section>
  );
}
