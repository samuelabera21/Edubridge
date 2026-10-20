import LearningResourcesWorkspace from "../LearningResourcesWorkspace";

export default function StudentSchoolResourcesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-2 sm:p-4">
      <LearningResourcesWorkspace initialSubNav="school" />
    </div>
  );
}
