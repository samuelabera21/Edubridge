import LearningResourcesWorkspace from "../LearningResourcesWorkspace";

export default function StudentRecommendedResourcesPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-2 sm:p-4">
      <LearningResourcesWorkspace initialSubNav="recommended" />
    </div>
  );
}
