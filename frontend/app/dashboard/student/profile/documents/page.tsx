import ProfileHeader from "../ProfileHeader";
import EnrollmentDocumentsCard from "../EnrollmentDocumentsCard";

export default function StudentEnrollmentDocumentsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      <ProfileHeader
        title="Enrollment Documents"
        subtitle="Review official identity certificates, transcripts, and verified documents submitted upon admission."
      />

      <EnrollmentDocumentsCard />
    </div>
  );
}
