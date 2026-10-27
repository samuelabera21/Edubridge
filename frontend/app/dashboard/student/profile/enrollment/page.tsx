import ProfileHeader from "../ProfileHeader";
import SchoolEnrollmentCard from "../SchoolEnrollmentCard";

export default function StudentEnrollmentPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      <ProfileHeader
        title="School and Enrollment"
        subtitle="Current academic year status, assigned school branch, and classroom placement details."
      />

      <SchoolEnrollmentCard />
    </div>
  );
}