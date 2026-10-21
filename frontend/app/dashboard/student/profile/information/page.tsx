import ProfileHeader from "../ProfileHeader";
import StudentInfoCard from "../StudentInfoCard";

export default function StudentInformationPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      <ProfileHeader
        title="Student Information"
        subtitle="Your official verified biographical and family record registered in the school registry."
      />

      <StudentInfoCard />
    </div>
  );
}