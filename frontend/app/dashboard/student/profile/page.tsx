import ProfileHeader from "./ProfileHeader";
import StudentInfoCard from "./StudentInfoCard";
import SchoolEnrollmentCard from "./SchoolEnrollmentCard";
import EnrollmentDocumentsCard from "./EnrollmentDocumentsCard";

export default function StudentProfilePage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      <ProfileHeader
        title="My Profile"
        subtitle="View and verify your registered academic identity, section enrollment, and school details."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <StudentInfoCard />
        <SchoolEnrollmentCard />
      </div>

      <EnrollmentDocumentsCard />
    </div>
  );
}
