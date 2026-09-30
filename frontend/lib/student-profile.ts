export type StudentProfileApiData = {
  id?: string | null;
  studentId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fatherName?: string | null;
  grandfatherName?: string | null;
  dateOfBirth?: string | Date | null;
  gender?: string | null;
  nationality?: string | null;
  placeOfBirth?: string | null;
  photoUrl?: string | null;
  region?: string | null;
  zone?: string | null;
  woreda?: string | null;
  city?: string | null;
  kebele?: string | null;
  houseNumber?: string | null;
  previousSchool?: string | null;
  previousStudentId?: string | null;
  emergencyContactName?: string | null;
  emergencyContactRelation?: string | null;
  emergencyContactPhone?: string | null;
  enrollments?: Array<{
    id?: string | null;
    status?: string | null;
    enrollmentDate?: string | Date | null;
    academicYear?: { name?: string | null } | null;
    schoolGrade?: { grade?: { name?: string | null } | null } | null;
    section?: { name?: string | null } | null;
    organization?: {
      name?: string | null;
      schoolProfile?: {
        address?: string | null;
        phoneNumber?: string | null;
        contactEmail?: string | null;
      } | null;
    } | null;
  }> | null;
};

export type StudentProfileView = {
  id: string | null;
  fullName: string;
  studentId: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  grandfatherName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  placeOfBirth: string;
  photoUrl: string | null;
  region: string;
  zone: string;
  woreda: string;
  city: string;
  kebele: string;
  houseNumber: string;
  previousSchool: string;
  previousStudentId: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  schoolName: string;
  academicYear: string;
  gradeName: string;
  sectionName: string;
  enrollmentStatus: string;
  enrollmentDate: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolEmail: string;
  isReadOnly: true;
};

function formatDate(dateValue: string | Date | null | undefined) {
  if (!dateValue) return "Not provided";

  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Not provided";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatGender(value: string | null | undefined) {
  if (!value) return "Not provided";

  const normalized = value.toLowerCase();
  if (normalized === "female" || normalized === "f") return "Female";
  if (normalized === "male" || normalized === "m") return "Male";
  return value;
}

export function buildStudentProfileView(profile: StudentProfileApiData): StudentProfileView {
  const enrollment = Array.isArray(profile?.enrollments)
    ? profile.enrollments.find((item) => item?.status === "ACTIVE" || item?.status === "ENROLLED") ?? profile.enrollments[0] ?? null
    : null;

  const school = enrollment?.organization ?? null;
  const schoolProfile = school?.schoolProfile ?? null;

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Student";

  return {
    id: profile?.id ?? null,
    fullName,
    studentId: profile?.studentId ?? "Not provided",
    firstName: profile?.firstName ?? "Not provided",
    lastName: profile?.lastName ?? "Not provided",
    fatherName: profile?.fatherName ?? "Not provided",
    grandfatherName: profile?.grandfatherName ?? "Not provided",
    dateOfBirth: formatDate(profile?.dateOfBirth),
    gender: formatGender(profile?.gender),
    nationality: profile?.nationality ?? "Not provided",
    placeOfBirth: profile?.placeOfBirth ?? "Not provided",
    photoUrl: profile?.photoUrl ?? null,
    region: profile?.region ?? "Not provided",
    zone: profile?.zone ?? "Not provided",
    woreda: profile?.woreda ?? "Not provided",
    city: profile?.city ?? "Not provided",
    kebele: profile?.kebele ?? "Not provided",
    houseNumber: profile?.houseNumber ?? "Not provided",
    previousSchool: profile?.previousSchool ?? "Not provided",
    previousStudentId: profile?.previousStudentId ?? "Not provided",
    emergencyContactName: profile?.emergencyContactName ?? "Not provided",
    emergencyContactRelation: profile?.emergencyContactRelation ?? "Not provided",
    emergencyContactPhone: profile?.emergencyContactPhone ?? "Not provided",
    schoolName: school?.name ?? "Not provided",
    academicYear: enrollment?.academicYear?.name ?? "Not provided",
    gradeName: enrollment?.schoolGrade?.grade?.name ?? "Not provided",
    sectionName: enrollment?.section?.name ?? "Not assigned",
    enrollmentStatus: enrollment?.status ?? "Not provided",
    enrollmentDate: formatDate(enrollment?.enrollmentDate),
    schoolAddress: schoolProfile?.address ?? "Not provided",
    schoolPhone: schoolProfile?.phoneNumber ?? "Not provided",
    schoolEmail: schoolProfile?.contactEmail ?? "Not provided",
    isReadOnly: true,
  };
}
