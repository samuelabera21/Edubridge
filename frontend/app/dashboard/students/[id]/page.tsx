"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { 
    ArrowLeft, 
    ExternalLink,
    Check,
    X,
    FileText,
    Calendar,
    UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import Link from "next/link";

interface StudentDossier {
    id: string;
    studentId: string;
    firstName: string;
    fatherName?: string;
    grandfatherName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    nationality?: string;
    placeOfBirth?: string;
    nationalId?: string;
    region?: string;
    zone?: string;
    woreda?: string;
    city?: string;
    kebele?: string;
    houseNumber?: string;
    previousSchool?: string;
    previousStudentId?: string;
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactPhone?: string;
    enrollments?: any[];
    guardians?: any[];
    studentDocuments?: any[];
}

export default function StudentProfilePage() {
    const params = useParams();
    const router = useRouter();
    const studentId = params.id as string;

    const [student, setStudent] = useState<StudentDossier | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);

    const loadStudent = async () => {
        try {
            setLoading(true);
            const res = await fetchApi(`/student/${studentId}`);
            if (!res.ok) throw new Error("Failed to load student profile");
            const data = await res.json();
            setStudent(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred while loading student dossier");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (studentId) {
            loadStudent();
        }
    }, [studentId]);

    const handleVerifyDocument = async (docId: string, status: "VERIFIED" | "REJECTED") => {
        try {
            setVerifyingDocId(docId);
            const notes = status === "VERIFIED" ? "Verified against institutional records" : "Document rejected due to clarity issues";
            const res = await fetchApi(`/student/documents/${docId}/verify`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ verificationStatus: status, verificationNotes: notes })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || "Failed to update verification status");
            }

            await loadStudent();
        } catch (err: any) {
            alert(err.message || "Error verifying document");
        } finally {
            setVerifyingDocId(null);
        }
    };

    if (loading) return <LoadingState message="Loading student official dossier..." />;
    if (error || !student) return <ErrorState message={error || "Student record not found"} onRetry={() => router.back()} />;

    const fullName = `${student.firstName} ${student.fatherName || student.lastName || ""} ${student.grandfatherName || ""}`.trim();
    const documentsList = student.studentDocuments || [];
    const enrollmentsList = student.enrollments || [];
    const guardiansList = (student as any).parents || (student as any).guardians || [];

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => router.push("/dashboard/students/enrollments")}
                        className="text-slate-700 border-slate-300 hover:bg-slate-50"
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                        Back to Ledger
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 capitalize">{fullName}</h1>
                        <p className="text-xs font-mono text-slate-500 mt-0.5">
                            Student ID: <strong className="text-slate-800">{student.studentId}</strong>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link href="/dashboard/students">
                        <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                            Student Directory
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Student Identity Summary Bar */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                        <span className="text-slate-500 block">Full Name (3-Tier)</span>
                        <span className="font-semibold text-slate-900 capitalize text-sm">{fullName}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Gender</span>
                        <span className="font-medium text-slate-900 capitalize">
                            {student.gender ? student.gender.toLowerCase() : "Not specified"}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Date of Birth</span>
                        <span className="font-medium text-slate-900">
                            {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "—"}
                        </span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Residential City / Region</span>
                        <span className="font-medium text-slate-900">
                            {student.city || student.region || "Addis Ababa"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Section 1: Academic Enrollment History */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Academic Enrollment History
                    </h2>
                    <span className="text-xs text-slate-500">
                        {enrollmentsList.length} Session Records
                    </span>
                </div>

                {enrollmentsList.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                        No active or historical enrollments recorded for this student.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider bg-slate-50/40">
                                    <th className="px-5 py-2.5">Academic Session</th>
                                    <th className="px-5 py-2.5">Grade Cohort</th>
                                    <th className="px-5 py-2.5">Section Placement</th>
                                    <th className="px-5 py-2.5">Intake Category</th>
                                    <th className="px-5 py-2.5">Enrollment Date</th>
                                    <th className="px-5 py-2.5 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {enrollmentsList.map((enr: any) => (
                                    <tr key={enr.id} className="hover:bg-slate-50/50">
                                        <td className="px-5 py-3 font-semibold text-slate-900">
                                            {enr.academicYear?.name || "Academic Year"}
                                        </td>
                                        <td className="px-5 py-3 text-slate-800">
                                            {enr.schoolGrade?.grade?.name || "Unassigned"}
                                        </td>
                                        <td className="px-5 py-3 text-slate-700">
                                            {enr.section ? (
                                                <span className="font-medium text-slate-900">
                                                    Section {enr.section.name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 italic">
                                                    Unplaced (Step 5)
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-slate-700 capitalize">
                                            {enr.enrollmentType ? enr.enrollmentType.replace("_", "-").toLowerCase() : "new"}
                                        </td>
                                        <td className="px-5 py-3 text-slate-600">
                                            {enr.enrollmentDate ? new Date(enr.enrollmentDate).toLocaleDateString() : "Active"}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                {enr.status.toLowerCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Section 2: Demographic & Residential Details */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200">
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Demographic & Residential Records
                    </h2>
                </div>
                <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-xs">
                    <div>
                        <span className="text-slate-500 block">First Name</span>
                        <span className="font-semibold text-slate-900 capitalize mt-0.5 block">{student.firstName}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Father's Name</span>
                        <span className="font-semibold text-slate-900 capitalize mt-0.5 block">{student.fatherName || "—"}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Grandfather's Name</span>
                        <span className="font-semibold text-slate-900 capitalize mt-0.5 block">{student.grandfatherName || "—"}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Nationality</span>
                        <span className="font-medium text-slate-900 mt-0.5 block">{student.nationality || "Ethiopian"}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Place of Birth</span>
                        <span className="font-medium text-slate-900 mt-0.5 block">{student.placeOfBirth || "—"}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">National / Kebele ID</span>
                        <span className="font-medium text-slate-900 mt-0.5 block">{student.nationalId || "—"}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Region / Sub-city</span>
                        <span className="font-medium text-slate-900 mt-0.5 block">{student.region || "Addis Ababa"} {student.zone ? `• ${student.zone}` : ""}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Woreda / Kebele</span>
                        <span className="font-medium text-slate-900 mt-0.5 block">{student.woreda || "—"} {student.kebele ? `/ Kebele ${student.kebele}` : ""}</span>
                    </div>
                    <div>
                        <span className="text-slate-500 block">Previous School</span>
                        <span className="font-medium text-slate-900 mt-0.5 block">{student.previousSchool || "N/A"}</span>
                    </div>
                </div>
            </div>

            {/* Section 3: Legal Guardians & Evidence Documents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Legal Guardians */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200">
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Legal Guardians & Contacts
                        </h2>
                    </div>
                    <div className="p-5 space-y-3 text-xs">
                        {guardiansList.length > 0 ? (
                            guardiansList.map((g: any, idx: number) => {
                                const parentName = g.parent ? `${g.parent.firstName} ${g.parent.lastName}` : (g.name || "Guardian");
                                const parentPhone = g.parent?.phoneNumber || g.phoneNumber || "—";
                                const parentEmail = g.parent?.email || g.email || null;
                                return (
                                    <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 text-sm">{parentName}</span>
                                            <div className="flex items-center gap-1.5">
                                                {g.isPrimary && (
                                                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
                                                        PRIMARY
                                                    </span>
                                                )}
                                                <span className="text-[11px] font-medium text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                                                    {g.relationship || "Guardian"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-slate-600">
                                            <p>
                                                Phone: <strong className="text-slate-800 font-mono">{parentPhone}</strong>
                                                {parentEmail && <span className="ml-3 text-slate-500">• {parentEmail}</span>}
                                            </p>
                                            {g.canPickup !== undefined && (
                                                <p className="text-[11px] text-slate-500">
                                                    Campus Pickup: <span className={g.canPickup ? "text-emerald-700 font-medium" : "text-slate-500"}>{g.canPickup ? "Authorized" : "Not Authorized"}</span>
                                                </p>
                                            )}
                                        </div>
                                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                                            <Link 
                                                href={`/dashboard/parents?search=${encodeURIComponent(parentName)}`}
                                                className="inline-flex items-center text-[11px] font-semibold text-[#0c2454] hover:underline"
                                            >
                                                <ExternalLink className="w-3 h-3 mr-1" />
                                                View Guardian Dossier & Linked Siblings
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-slate-500 text-xs">No registered legal guardian records found.</p>
                        )}

                        {student.emergencyContactName && (
                            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                                <span className="text-slate-500 block font-medium text-[11px]">Secondary Emergency Contact</span>
                                <p className="font-semibold text-slate-900 mt-0.5">
                                    {student.emergencyContactName} ({student.emergencyContactRelation || "Contact"})
                                </p>
                                <p className="text-slate-600 mt-0.5">
                                    Phone: <strong className="text-slate-800 font-mono">{student.emergencyContactPhone || "—"}</strong>
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Supporting Documents & Verification */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200">
                        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Supporting Documents & Verification
                        </h2>
                    </div>
                    <div className="p-5 space-y-3 text-xs">
                        {documentsList.length > 0 ? (
                            documentsList.map((doc: any) => (
                                <div key={doc.id} className="p-3 border border-slate-200 rounded-md bg-white space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-slate-900">{doc.title}</p>
                                            <p className="text-[11px] text-slate-500">{doc.documentType}</p>
                                        </div>
                                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                            {doc.verificationStatus}
                                        </span>
                                    </div>

                                    {doc.fileUrl && (
                                        <a 
                                            href={doc.fileUrl} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="inline-flex items-center text-[11px] font-medium text-[#4085b3] hover:underline"
                                        >
                                            <ExternalLink className="w-3 h-3 mr-1" />
                                            View Document File
                                        </a>
                                    )}

                                    {doc.verificationStatus === "PENDING" && (
                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleVerifyDocument(doc.id, "VERIFIED")}
                                                isLoading={verifyingDocId === doc.id}
                                                className="bg-[#4085b3] hover:bg-[#32698e] text-white text-[10px] h-6 px-2.5"
                                            >
                                                Verify
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline"
                                                onClick={() => handleVerifyDocument(doc.id, "REJECTED")}
                                                disabled={verifyingDocId === doc.id}
                                                className="text-red-600 hover:text-red-700 border-red-200 text-[10px] h-6 px-2.5"
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-xs">No official supporting documents attached.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
