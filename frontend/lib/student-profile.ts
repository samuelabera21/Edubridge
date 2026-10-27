export type StudentDocumentItem = {
  id: string;
  studentId?: string | null;
  enrollmentId?: string | null;
  documentType: string;
  title: string;
  fileUrl: string;
  fileSize?: number | null;
  mimeType?: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | string;
  verificationNotes?: string | null;
  verifiedAt?: string | Date | null;
  createdAt?: string | Date | null;
};

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
  studentDocuments?: StudentDocumentItem[] | null;
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
    documents?: StudentDocumentItem[] | null;
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
  documents: StudentDocumentItem[];
  isReadOnly: true;
};

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || Number.isNaN(bytes)) return "Standard size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDocumentType(type: string): string {
  switch (type?.toUpperCase()) {
    case "BIRTH_CERTIFICATE":
      return "Birth Certificate";
    case "PREVIOUS_TRANSCRIPT":
      return "Previous School Transcript";
    case "PARENT_ID":
    case "GUARDIAN_ID":
      return "Parent / Guardian ID";
    case "TRANSFER_CLEARANCE":
      return "Transfer Clearance";
    case "NATIONAL_ID":
      return "National ID";
    case "IMMUNIZATION_RECORD":
      return "Immunization Record";
    default:
      return type ? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Official Document";
  }
}

export function formatDate(dateValue: string | Date | null | undefined): string {
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

  // Collect documents from studentDocuments and all enrollment documents without duplicates
  const documentMap = new Map<string, StudentDocumentItem>();

  if (Array.isArray(profile?.studentDocuments)) {
    for (const doc of profile.studentDocuments) {
      if (doc?.id) {
        documentMap.set(doc.id, doc);
      }
    }
  }

  if (Array.isArray(profile?.enrollments)) {
    for (const enr of profile.enrollments) {
      if (Array.isArray(enr?.documents)) {
        for (const doc of enr.documents) {
          if (doc?.id && !documentMap.has(doc.id)) {
            documentMap.set(doc.id, doc);
          }
        }
      }
    }
  }

  const documents = Array.from(documentMap.values());

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
    documents,
    isReadOnly: true,
  };
}
