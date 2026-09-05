"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { 
    User, Phone, MapPin, School, BookOpen, ArrowLeft, GraduationCap, 
    FileText, CheckCircle2, X, Award, ShieldCheck, Clock, Plus, 
    AlertTriangle, Briefcase, Calendar, Check, Ban, ExternalLink, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";

export default function TeacherProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { authData } = useAuth();
    const teacherId = params.id as string;

    const [teacher, setTeacher] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Add Qualification Modal
    const [qualModalOpen, setQualModalOpen] = useState(false);
    const [newQual, setNewQual] = useState({
        qualificationLevel: "BACHELORS",
        qualificationTitle: "",
        fieldOfStudy: "",
        institution: "",
        graduationYear: new Date().getFullYear() - 2,
        credentialNumber: "",
        country: "Ethiopia",
        isHighest: false
    });

    // Update Status Modal
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [newStatus, setNewStatus] = useState("ACTIVE");
    const [statusReason, setStatusReason] = useState("");

    const isPrincipalOrAdmin = authData?.access.some(acc => 
        ["PRINCIPAL", "ADMIN", "SCHOOL_ADMIN"].includes(acc.role.name)
    );

    const loadTeacher = async () => {
        try {
            setLoading(true);
            const res = await fetchApi(`/teacher/${teacherId}`);
            if (!res.ok) throw new Error("Failed to load teacher profile");
            const data = await res.json();
            setTeacher(data);
            setNewStatus(data.employmentStatus || "ACTIVE");
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (teacherId) {
            loadTeacher();
        }
    }, [teacherId]);

    // Handle Qualification Verification
    const handleVerifyQualification = async (qualificationId: string, status: "VERIFIED" | "REJECTED") => {
        const notes = status === "REJECTED" 
            ? (prompt("Enter reason for rejection:") || "Credential requirements not met")
            : (prompt("Verification notes (optional):") || "Verified against official academic transcript");

        try {
            setActionLoading(true);
            const res = await fetchApi(`/teacher/${teacherId}/qualifications/${qualificationId}/verify`, {
                method: "POST",
                body: JSON.stringify({
                    verificationStatus: status,
                    verificationNotes: notes
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update qualification status");
            }

            setSuccessMessage(`Qualification successfully marked as ${status}.`);
            loadTeacher();
        } catch (err: any) {
            setError(err.message || "Failed to verify qualification");
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Adding New Qualification
    const handleAddQualification = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setActionLoading(true);
            const res = await fetchApi(`/teacher/${teacherId}/qualifications`, {
                method: "POST",
                body: JSON.stringify(newQual)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to add qualification");
            }

            setSuccessMessage("New qualification added. Pending verification.");
            setQualModalOpen(false);
            setNewQual({
                qualificationLevel: "BACHELORS",
                qualificationTitle: "",
                fieldOfStudy: "",
                institution: "",
                graduationYear: new Date().getFullYear() - 2,
                credentialNumber: "",
                country: "Ethiopia",
                isHighest: false
            });
            loadTeacher();
        } catch (err: any) {
            setError(err.message || "Failed to add qualification");
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Employment Status Update
    const handleUpdateStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setActionLoading(true);
            const res = await fetchApi(`/teacher/${teacherId}/employment-status`, {
                method: "PUT",
                body: JSON.stringify({
                    employmentStatus: newStatus,
                    reason: statusReason
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update employment status");
            }

            setSuccessMessage(`Teacher status updated to ${newStatus}. Historical assignments remain safely preserved.`);
            setStatusModalOpen(false);
            loadTeacher();
        } catch (err: any) {
            setError(err.message || "Failed to update status");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <LoadingState message="Loading teacher profile & credentials..." />;
    if (error && !teacher) return <ErrorState message={error || "Teacher not found"} onRetry={() => router.back()} />;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
                <Button 
                    variant="ghost" 
                    size="sm"
                    leftIcon={<ArrowLeft className="w-4 h-4" />} 
                    onClick={() => router.push("/dashboard/teachers")}
                >
                    Back to Teacher Directory
                </Button>

                <div className="flex items-center space-x-2">
                    {isPrincipalOrAdmin && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStatusModalOpen(true)}
                            leftIcon={<Briefcase className="w-3.5 h-3.5" />}
                        >
                            Update Employment Status
                        </Button>
                    )}

                    <Button
                        size="sm"
                        onClick={() => router.push(`/dashboard/teachers/assignments/manage?teacherId=${teacher.id}`)}
                        className="bg-[#006b3f] hover:bg-[#005432] text-white"
                        leftIcon={<BookOpen className="w-3.5 h-3.5" />}
                    >
                        Assign to Classes
                    </Button>
                </div>
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* TEACHER HEADER CARD */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex items-center space-x-5">
                    <div className="w-20 h-20 rounded-2xl bg-[#006b3f] text-white flex items-center justify-center font-bold text-2xl shadow-sm">
                        {teacher.firstName[0]}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {teacher.firstName} {teacher.fatherName} {teacher.lastName}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {teacher.jobTitle || "Faculty Member"} &bull; Staff Code: <span className="font-semibold text-gray-700">{teacher.staffIdCode || teacher.employeeId || "N/A"}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                                teacher.employmentStatus === "ACTIVE" 
                                    ? "bg-emerald-100 text-emerald-800" 
                                    : teacher.employmentStatus === "ON_LEAVE"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-gray-100 text-gray-700"
                            }`}>
                                {teacher.employmentStatus}
                            </span>

                            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-100">
                                {teacher.employmentType?.replace("_", " ")}
                            </span>

                            {teacher.homeroomSections && teacher.homeroomSections.length > 0 && (
                                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-100">
                                    Homeroom: {teacher.homeroomSections[0].schoolGrade?.grade?.name} ({teacher.homeroomSections[0].name})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Workload Quick KPI */}
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-xs flex items-center space-x-4">
                    <div>
                        <p className="text-gray-500 font-medium">Assigned Classes</p>
                        <p className="text-lg font-bold text-gray-900">{teacher.assignments?.length || 0}</p>
                    </div>
                    <div className="border-l border-gray-200 pl-4">
                        <p className="text-gray-500 font-medium">Total Load</p>
                        <p className="text-lg font-bold text-[#006b3f]">
                            {teacher.assignments?.reduce((acc: number, a: any) => acc + (a.periodsPerWeek || 5), 0) || 0} <span className="text-[10px] font-normal text-gray-500">p/wk</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN: Identity & Contact Info */}
                <div className="space-y-6 lg:col-span-1">
                    {/* Identity Details */}
                    <Card className="shadow-2xs border-gray-200">
                        <CardHeader className="bg-gray-50/70 py-3 border-b border-gray-100">
                            <CardTitle className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center">
                                <User className="w-4 h-4 mr-2 text-[#006b3f]" />
                                Identity Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3 text-xs">
                            <div>
                                <p className="text-gray-400">Full Ethiopian Name</p>
                                <p className="font-semibold text-gray-800">
                                    {teacher.firstName} {teacher.fatherName} {teacher.lastName} {teacher.grandfatherName ? `(${teacher.grandfatherName})` : ""}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-gray-400">Gender</p>
                                    <p className="font-semibold text-gray-800">{teacher.gender || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">Date of Birth</p>
                                    <p className="font-semibold text-gray-800">
                                        {teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : "N/A"}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-gray-400">Nationality</p>
                                    <p className="font-semibold text-gray-800">{teacher.nationality || "Ethiopian"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400">National ID / Fayda</p>
                                    <p className="font-semibold text-gray-800">{teacher.nationalIdNumber || "N/A"}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-400">Appointment Date</p>
                                <p className="font-semibold text-gray-800">
                                    {teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : "N/A"}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contact & Address */}
                    <Card className="shadow-2xs border-gray-200">
                        <CardHeader className="bg-gray-50/70 py-3 border-b border-gray-100">
                            <CardTitle className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center">
                                <Phone className="w-4 h-4 mr-2 text-[#006b3f]" />
                                Contact & Residence
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3 text-xs">
                            <div>
                                <p className="text-gray-400">Phone</p>
                                <p className="font-semibold text-gray-800">{teacher.phoneNumber || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Email</p>
                                <p className="font-semibold text-gray-800">{teacher.email || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Location</p>
                                <p className="font-semibold text-gray-800">
                                    {teacher.region || "Addis Ababa"}{teacher.zone ? `, ${teacher.zone}` : ""}{teacher.woreda ? `, Woreda ${teacher.woreda}` : ""}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Workload Policy Thresholds */}
                    <Card className="shadow-2xs border-gray-200">
                        <CardHeader className="bg-gray-50/70 py-3 border-b border-gray-100">
                            <CardTitle className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-[#006b3f]" />
                                Workload Policy Parameters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Target Weekly Load:</span>
                                <span className="font-bold text-gray-900">{teacher.targetWorkload || 22} periods/week</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Minimum Workload:</span>
                                <span className="font-semibold text-gray-700">{teacher.minWorkload || 18} periods/week</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Maximum Overload Cap:</span>
                                <span className="font-semibold text-gray-700">{teacher.maxWorkload || 28} periods/week</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Qualifications, Specializations, and Instructional Allocations */}
                <div className="lg:col-span-2 space-y-6">
                    {/* 1. Professional Qualifications & Credentials */}
                    <Card className="shadow-2xs border-gray-200 overflow-hidden">
                        <CardHeader className="bg-gray-50/70 py-3.5 border-b border-gray-100 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                                    <Award className="w-4 h-4 text-[#006b3f]" />
                                    <span>Professional Qualifications & Credentials</span>
                                </CardTitle>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    MoE standard credentials with school-level administrative authentication
                                </p>
                            </div>

                            {isPrincipalOrAdmin && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setQualModalOpen(true)}
                                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                                    className="text-xs text-[#006b3f] border-[#006b3f]/30"
                                >
                                    Add Qualification
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            {!teacher.qualifications || teacher.qualifications.length === 0 ? (
                                <div className="p-6 text-center text-xs text-gray-400 italic">
                                    No structured qualification records found for this teacher.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {teacher.qualifications.map((q: any) => (
                                        <div key={q.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs font-bold text-gray-900">{q.qualificationTitle}</span>
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100">
                                                            {q.qualificationLevel}
                                                        </span>
                                                        {q.isHighest && (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                                                Highest
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        <strong>Field:</strong> {q.fieldOfStudy} &bull; <strong>Institution:</strong> {q.institution} ({q.graduationYear})
                                                    </p>
                                                    {q.credentialNumber && (
                                                        <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                                                            Serial / Roll: {q.credentialNumber} &bull; {q.country}
                                                        </p>
                                                    )}
                                                    {q.verificationNotes && (
                                                        <p className="text-[11px] text-gray-500 italic mt-1 bg-gray-50 p-1.5 rounded">
                                                            Note: {q.verificationNotes}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex flex-col sm:items-end space-y-2">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                                        q.verificationStatus === "VERIFIED"
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : q.verificationStatus === "REJECTED"
                                                            ? "bg-red-100 text-red-800"
                                                            : "bg-amber-100 text-amber-800"
                                                    }`}>
                                                        {q.verificationStatus}
                                                    </span>

                                                    {q.verificationStatus === "PENDING" && isPrincipalOrAdmin && (
                                                        <div className="flex items-center space-x-1.5 pt-1">
                                                            <button
                                                                onClick={() => handleVerifyQualification(q.id, "VERIFIED")}
                                                                disabled={actionLoading}
                                                                className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200"
                                                            >
                                                                Verify Credential
                                                            </button>
                                                            <button
                                                                onClick={() => handleVerifyQualification(q.id, "REJECTED")}
                                                                disabled={actionLoading}
                                                                className="text-[11px] font-semibold text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded border border-red-200"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}

                                                    {q.verifiedBy && (
                                                        <span className="text-[10px] text-gray-400">
                                                            Verified by: {q.verifiedBy.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 2. Teaching Eligibility & Subject Specializations */}
                    <Card className="shadow-2xs border-gray-200">
                        <CardHeader className="bg-gray-50/70 py-3 border-b border-gray-100">
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                                <ShieldCheck className="w-4 h-4 text-[#006b3f]" />
                                <span>Subject Specializations & Education Cycle Eligibility</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            {!teacher.specializations || teacher.specializations.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No subject specializations recorded.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {teacher.specializations.map((spec: any) => (
                                        <div key={spec.id} className="p-3 bg-gray-50/60 rounded-xl border border-gray-200 text-xs flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-gray-900">{spec.subject?.name}</p>
                                                <p className="text-[11px] text-gray-500">{spec.cycle?.replace(/_/g, " ") || "All Cycles"}</p>
                                            </div>
                                            <div className="flex flex-col items-end space-y-1">
                                                {spec.isPrimary && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                                        Primary
                                                    </span>
                                                )}
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                                    spec.verified ? "text-emerald-700 bg-emerald-50" : "text-gray-500 bg-gray-100"
                                                }`}>
                                                    {spec.verified ? "Verified Match" : "Unverified"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 3. Teaching Assignments (Step 3 Instructional Allocations) */}
                    <Card className="shadow-2xs border-gray-200 overflow-hidden">
                        <CardHeader className="bg-gray-50/70 py-3.5 border-b border-gray-100 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                                    <BookOpen className="w-4 h-4 text-[#006b3f]" />
                                    <span>Instructional Teaching Allocations (Step 3)</span>
                                </CardTitle>
                                <p className="text-[11px] text-gray-500 mt-0.5">Authoritative periods allocated across academic years</p>
                            </div>

                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/teachers/assignments/manage?teacherId=${teacher.id}`)}
                                className="text-xs"
                            >
                                Manage Allocations
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!teacher.assignments || teacher.assignments.length === 0 ? (
                                <div className="p-6 text-center text-xs text-gray-400 italic">
                                    No active or historical teaching assignments allocated for this teacher.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="text-[11px] text-gray-500 uppercase bg-gray-50/80 border-b border-gray-100">
                                            <tr>
                                                <th className="px-5 py-2.5 font-semibold">Academic Year</th>
                                                <th className="px-5 py-2.5 font-semibold">Subject</th>
                                                <th className="px-5 py-2.5 font-semibold">Grade & Section</th>
                                                <th className="px-5 py-2.5 font-semibold">Weekly Load</th>
                                                <th className="px-5 py-2.5 font-semibold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {teacher.assignments.map((asgn: any) => (
                                                <tr key={asgn.id} className="hover:bg-gray-50/50">
                                                    <td className="px-5 py-3 font-semibold text-gray-900">
                                                        {asgn.academicYear?.name}
                                                    </td>
                                                    <td className="px-5 py-3 font-medium text-gray-800">
                                                        {asgn.subject?.name}
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-600">
                                                        {asgn.schoolGrade?.grade?.name} {asgn.section ? `\u2014 Sec ${asgn.section.name}` : "(All Sections)"}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className="font-mono font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                                                            {asgn.periodsPerWeek || 5} p/wk
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                                            asgn.status === "ACTIVE" 
                                                                ? "bg-emerald-100 text-emerald-800" 
                                                                : asgn.status === "PROPOSED"
                                                                ? "bg-amber-100 text-amber-800"
                                                                : "bg-gray-100 text-gray-700"
                                                        }`}>
                                                            {asgn.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ADD QUALIFICATION MODAL */}
            <Modal
                isOpen={qualModalOpen}
                onClose={() => setQualModalOpen(false)}
                title="Add Professional Qualification"
            >
                <form onSubmit={handleAddQualification} className="space-y-4 text-xs">
                    <div>
                        <label className="block font-semibold text-gray-700 mb-1">Qualification Level *</label>
                        <select
                            value={newQual.qualificationLevel}
                            onChange={(e: any) => setNewQual(prev => ({ ...prev, qualificationLevel: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            required
                        >
                            <option value="CERTIFICATE">Certificate</option>
                            <option value="DIPLOMA">Diploma</option>
                            <option value="BACHELORS">Bachelor's / First Degree</option>
                            <option value="MASTERS">Master's Degree</option>
                            <option value="DOCTORATE">Doctorate / PhD</option>
                            <option value="OTHER">Other Recognized Level</option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-semibold text-gray-700 mb-1">Degree / Qualification Title *</label>
                        <input
                            type="text"
                            value={newQual.qualificationTitle}
                            onChange={(e) => setNewQual(prev => ({ ...prev, qualificationTitle: e.target.value }))}
                            placeholder="e.g. Master of Science in Physics"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Field of Study *</label>
                            <input
                                type="text"
                                value={newQual.fieldOfStudy}
                                onChange={(e) => setNewQual(prev => ({ ...prev, fieldOfStudy: e.target.value }))}
                                placeholder="e.g. Physics"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Graduation Year *</label>
                            <input
                                type="number"
                                min="1960"
                                max={new Date().getFullYear() + 1}
                                value={newQual.graduationYear}
                                onChange={(e) => setNewQual(prev => ({ ...prev, graduationYear: Number(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-semibold text-gray-700 mb-1">Institution / University *</label>
                        <input
                            type="text"
                            value={newQual.institution}
                            onChange={(e) => setNewQual(prev => ({ ...prev, institution: e.target.value }))}
                            placeholder="e.g. Addis Ababa University"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            required
                        />
                    </div>

                    <div>
                        <label className="block font-semibold text-gray-700 mb-1">Credential Serial Number</label>
                        <input
                            type="text"
                            value={newQual.credentialNumber}
                            onChange={(e) => setNewQual(prev => ({ ...prev, credentialNumber: e.target.value }))}
                            placeholder="e.g. AAU-2022-9988"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                        <Button type="button" variant="outline" size="sm" onClick={() => setQualModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" isLoading={actionLoading} className="bg-[#006b3f] hover:bg-[#005432] text-white">
                            Save Qualification
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* UPDATE EMPLOYMENT STATUS MODAL */}
            <Modal
                isOpen={statusModalOpen}
                onClose={() => setStatusModalOpen(false)}
                title="Update Teacher Employment Status"
            >
                <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
                    <p className="text-gray-500">
                        Updating status will preserve all past qualifications, assessment records, and historical assignments.
                    </p>

                    <div>
                        <label className="block font-semibold text-gray-700 mb-1">Employment Status *</label>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
                            required
                        >
                            <option value="ACTIVE">Active (ንቁ)</option>
                            <option value="ON_LEAVE">On Leave (ፈቃድ ላይ)</option>
                            <option value="TRANSFERRED">Transferred (የተዛወረ)</option>
                            <option value="RESIGNED">Resigned (የለቀቀ)</option>
                            <option value="RETIRED">Retired (ጡረታ)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-semibold text-gray-700 mb-1">Reason / Official Reference (Optional)</label>
                        <textarea
                            rows={3}
                            value={statusReason}
                            onChange={(e) => setStatusReason(e.target.value)}
                            placeholder="e.g. Transferred per regional education bureau letter ref #9981"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                        <Button type="button" variant="outline" size="sm" onClick={() => setStatusModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" isLoading={actionLoading} className="bg-[#006b3f] hover:bg-[#005432] text-white">
                            Save Status Change
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
