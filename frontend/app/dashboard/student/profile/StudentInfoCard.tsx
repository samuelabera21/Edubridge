export default function StudentInfoCard() {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Student Information</h2>
      <div className="space-y-3 text-sm text-gray-700">
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="text-gray-500">Full name</span>
          <span className="font-medium text-gray-900">Aisha Johnson</span>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="text-gray-500">Student ID</span>
          <span className="font-medium text-gray-900">STU-2048</span>
        </div>
        <div className="flex justify-between border-b border-gray-100 pb-2">
          <span className="text-gray-500">Date of birth</span>
          <span className="font-medium text-gray-900">12 Apr 2014</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Gender</span>
          <span className="font-medium text-gray-900">Female</span>
        </div>
      </div>
    </section>
  );
}
