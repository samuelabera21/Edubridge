"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
    ArrowLeft, CheckCircle2, X, Plus, 
    AlertTriangle, Calendar, Search, ChevronLeft, ChevronRight
} from "lucide-react";
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

    // Allocation Table Filter & Pagination
    const [allocationSearch, setAllocationSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(8);

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

            setSuccessMessage(`Qualification marked as ${status}.`);
            loadTeacher();
            setTimeout(() => setSuccessMessage(null), 3000);
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

            setSuccessMessage("New qualification added.");
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
            setTimeout(() => setSuccessMessage(null), 3000);
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

            setSuccessMessage(`Teacher status updated to ${newStatus}.`);
            setStatusModalOpen(false);
            loadTeacher();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to update employment status");
        } finally {
            setActionLoading(false);
        }
    };

    // Filtered & Paginated Allocations
    const filteredAssignments = useMemo(() => {
        const list = teacher?.assignments || [];
        if (!allocationSearch.trim()) return list;
        const q = allocationSearch.toLowerCase();
        return list.filter((a: any) => 
            (a.subject?.name && a.subject.name.toLowerCase().includes(q)) ||
            (a.schoolGrade?.grade?.name && a.schoolGrade.grade.name.toLowerCase().includes(q)) ||
            (a.academicYear?.name && a.academicYear.name.toLowerCase().includes(q)) ||
            (a.section?.name && a.section.name.toLowerCase().includes(q))
        );
    }, [teacher?.assignments, allocationSearch]);

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [allocationSearch, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / pageSize));
    const paginatedAssignments = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredAssignments.slice(start, start + pageSize);
    }, [filteredAssignments, currentPage, pageSize]);

    const totalLoad = useMemo(() => {
        return teacher?.assignments?.reduce((acc: number, a: any) => acc + (a.periodsPerWeek || 5), 0) || 0;
    }, [teacher?.assignments]);

    if (loading && !teacher) {
        return <LoadingState message="Loading teacher profile..." />;
    }

    if (error && !teacher) {
        return <ErrorState message={error} onRetry={loadTeacher} />;
    }

    return (
        <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans text-gray-900">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/teachers" className="hover:text-gray-900">Teachers</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">{teacher.firstName} {teacher.lastName}</span>
            </div>

            {/* Clean Top Action Bar */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                    onClick={() => router.push("/dashboard/teachers")}
                    className="inline-flex items-center space-x-1.5 text-xs text-gray-700 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md transition-colors cursor-pointer w-fit"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Directory</span>
                </button>

                <div className="flex items-center space-x-2.5">
                    {isPrincipalOrAdmin && (
                        <button
                            onClick={() => setStatusModalOpen(true)}
                            className="px-3.5 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Update Status
                        </button>
                    )}
                    <button
                        onClick={() => router.push(`/dashboard/teachers/assignments/manage?teacherId=${teacher.id}`)}
                        className="px-4 py-1.5 text-xs font-medium text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-md transition-colors shadow-xs cursor-pointer"
                    >
                        Assign to Classes
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-md flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">&times;</button>
                </div>
            )}
            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-2.5 rounded-md flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer">&times;</button>
                </div>
            )}

            {/* Teacher Header Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 flex items-center justify-center font-bold text-xl flex-shrink-0">
                        {teacher.firstName ? teacher.firstName[0].toUpperCase() : "T"}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                            {teacher.firstName} {teacher.fatherName} {teacher.lastName}
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {teacher.jobTitle || "Teacher"} &bull; Staff Code: <span className="font-mono font-semibold text-gray-700">{teacher.staffIdCode || teacher.employeeId || "—"}</span>
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                                teacher.employmentStatus === "ACTIVE" 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                    : teacher.employmentStatus === "ON_LEAVE"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-gray-50 text-gray-700 border border-gray-200"
                            }`}>
                                {teacher.employmentStatus || "ACTIVE"}
                            </span>

                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                                {teacher.employmentType?.replace("_", " ") || "Permanent"}
                            </span>

                            {teacher.homeroomSections && teacher.homeroomSections.length > 0 && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-sky-50 text-[#4085b3] border border-sky-200">
                                    Homeroom: {teacher.homeroomSections[0].schoolGrade?.grade?.name} ({teacher.homeroomSections[0].name})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Workload Quick KPI */}
                <div className="bg-gray-50 rounded-md p-3.5 border border-gray-200 text-xs flex items-center space-x-4">
                    <div>
                        <p className="text-gray-500 text-[10px] uppercase font-semibold">Assigned Sections</p>
                        <p className="text-base font-bold text-gray-900">{teacher.assignments?.length || 0}</p>
                    </div>
                    <div className="border-l border-gray-200 pl-4">
                        <p className="text-gray-500 text-[10px] uppercase font-semibold">Total Load</p>
                        <p className="text-base font-bold font-mono text-gray-900">
                            {totalLoad} <span className="text-xs font-normal text-gray-500">p/wk</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Left Column: Identity & Contact Info */}
                <div className="space-y-5 lg:col-span-1">
                    {/* Identity Details */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-200">
                            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                Identity Information
                            </h2>
                        </div>
                        <div className="p-4 space-y-3 text-xs">
                            <div>
                                <p className="text-gray-500 text-[11px]">Full Name</p>
                                <p className="font-semibold text-gray-900">
                                    {teacher.firstName} {teacher.fatherName} {teacher.lastName} {teacher.grandfatherName ? `(${teacher.grandfatherName})` : ""}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-gray-500 text-[11px]">Gender</p>
                                    <p className="font-medium text-gray-800">{teacher.gender || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-[11px]">Date of Birth</p>
                                    <p className="font-medium text-gray-800">
                                        {teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : "—"}
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <p className="text-gray-500 text-[11px]">Nationality</p>
                                    <p className="font-medium text-gray-800">{teacher.nationality || "Ethiopian"}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-[11px]">National ID / Fayda</p>
                                    <p className="font-mono text-gray-800">{teacher.nationalIdNumber || "—"}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-500 text-[11px]">Appointment Date</p>
                                <p className="font-medium text-gray-800">
                                    {teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : "—"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contact & Address */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-200">
                            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                Contact & Residence
                            </h2>
                        </div>
                        <div className="p-4 space-y-3 text-xs">
                            <div>
                                <p className="text-gray-500 text-[11px]">Phone Number</p>
                                <p className="font-mono font-medium text-gray-900">{teacher.phoneNumber || "—"}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-[11px]">Email Address</p>
                                <p className="font-medium text-gray-900">{teacher.email || "—"}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 text-[11px]">Location</p>
                                <p className="font-medium text-gray-900">
                                    {teacher.region || "Addis Ababa"}{teacher.zone ? `, ${teacher.zone}` : ""}{teacher.woreda ? `, Woreda ${teacher.woreda}` : ""}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Workload Parameters */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50/70 border-b border-gray-200">
                            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                Workload Policy Parameters
                            </h2>
                        </div>
                        <div className="p-4 space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Target Weekly Load:</span>
                                <span className="font-semibold text-gray-900">{teacher.targetWorkload || 22} p/wk</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Minimum Workload:</span>
                                <span className="font-semibold text-gray-700">{teacher.minWorkload || 18} p/wk</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Maximum Overload Cap:</span>
                                <span className="font-semibold text-gray-700">{teacher.maxWorkload || 28} p/wk</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Qualifications, Specializations, and Instructional Allocations */}
                <div className="lg:col-span-2 space-y-5">
                    {/* 1. Professional Qualifications */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                Qualifications & Degrees
                            </h2>
                            {isPrincipalOrAdmin && (
                                <button
                                    onClick={() => setQualModalOpen(true)}
                                    className="inline-flex items-center space-x-1 text-xs text-[#4085b3] hover:text-[#2b6a94] font-medium cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Qualification</span>
                                </button>
                            )}
                        </div>
                        <div className="p-0">
                            {!teacher.qualifications || teacher.qualifications.length === 0 ? (
                                <div className="p-6 text-center text-xs text-gray-400 italic">
                                    No qualification records found for this teacher.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {teacher.qualifications.map((q: any) => (
                                        <div key={q.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-xs font-bold text-gray-900">{q.qualificationTitle}</span>
                                                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                                                            {q.qualificationLevel}
                                                        </span>
                                                        {q.isHighest && (
                                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                                                Highest
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        {q.fieldOfStudy} &bull; {q.institution} ({q.graduationYear})
                                                    </p>
                                                    {q.credentialNumber && (
                                                        <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                                                            Credential No: {q.credentialNumber} &bull; {q.country}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex flex-col sm:items-end space-y-1.5">
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                                                        q.verificationStatus === "VERIFIED"
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : q.verificationStatus === "REJECTED"
                                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                            : "bg-amber-50 text-amber-700 border border-amber-200"
                                                    }`}>
                                                        {q.verificationStatus || "PENDING"}
                                                    </span>

                                                    {q.verificationStatus === "PENDING" && isPrincipalOrAdmin && (
                                                        <div className="flex items-center space-x-1 pt-1">
                                                            <button
                                                                onClick={() => handleVerifyQualification(q.id, "VERIFIED")}
                                                                disabled={actionLoading}
                                                                className="text-[11px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer"
                                                            >
                                                                Verify
                                                            </button>
                                                            <button
                                                                onClick={() => handleVerifyQualification(q.id, "REJECTED")}
                                                                disabled={actionLoading}
                                                                className="text-[11px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded border border-rose-200 cursor-pointer"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Specializations & Education Cycle */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-200">
                            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                Subject Specializations & Cycle Eligibility
                            </h2>
                        </div>
                        <div className="p-4">
                            {!teacher.specializations || teacher.specializations.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">No subject specializations recorded.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {teacher.specializations.map((spec: any) => (
                                        <div key={spec.id} className="p-3 bg-gray-50 rounded-md border border-gray-200 text-xs flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-gray-900">{spec.subject?.name}</p>
                                                <p className="text-[11px] text-gray-500">{spec.cycle?.replace(/_/g, " ") || "All Cycles"}</p>
                                            </div>
                                            <div className="flex flex-col items-end space-y-1">
                                                {spec.isPrimary && (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-50 text-[#4085b3] border border-sky-200">
                                                        Primary
                                                    </span>
                                                )}
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                    spec.verified ? "text-emerald-700 bg-emerald-50 border border-emerald-200" : "text-gray-500 bg-gray-100"
                                                }`}>
                                                    {spec.verified ? "Verified" : "Unverified"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Teaching Allocations with Search & Pagination */}
                    <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                        <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                    Teaching Allocations ({teacher.assignments?.length || 0})
                                </h2>
                            </div>

                            <div className="flex items-center space-x-2">
                                {/* Search */}
                                {teacher.assignments && teacher.assignments.length > 0 && (
                                    <div className="relative w-full sm:w-48">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search allocations..."
                                            value={allocationSearch}
                                            onChange={(e) => setAllocationSearch(e.target.value)}
                                            className="w-full pl-7 pr-2.5 py-1 text-xs bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                                        />
                                    </div>
                                )}

                                <button
                                    onClick={() => router.push(`/dashboard/teachers/assignments/manage?teacherId=${teacher.id}`)}
                                    className="px-3 py-1 text-xs text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-md transition-colors font-medium cursor-pointer flex-shrink-0"
                                >
                                    Manage
                                </button>
                            </div>
                        </div>

                        <div className="p-0">
                            {!teacher.assignments || teacher.assignments.length === 0 ? (
                                <div className="p-6 text-center text-xs text-gray-400 italic">
                                    No teaching assignments allocated for this teacher.
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left text-gray-700">
                                            <thead className="text-[11px] text-gray-600 uppercase bg-gray-50 border-b border-gray-200 font-semibold">
                                                <tr>
                                                    <th className="px-4 py-2.5">Year</th>
                                                    <th className="px-4 py-2.5">Subject</th>
                                                    <th className="px-4 py-2.5">Grade & Section</th>
                                                    <th className="px-4 py-2.5 text-center">Weekly Load</th>
                                                    <th className="px-4 py-2.5 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {paginatedAssignments.map((asgn: any) => (
                                                    <tr key={asgn.id} className="hover:bg-gray-50/70 transition-colors">
                                                        <td className="px-4 py-2.5 font-medium text-gray-900">
                                                            {asgn.academicYear?.name}
                                                        </td>
                                                        <td className="px-4 py-2.5 font-semibold text-gray-900">
                                                            {asgn.subject?.name}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-gray-700">
                                                            {asgn.schoolGrade?.grade?.name} {asgn.section ? `\u2014 Sec ${asgn.section.name}` : "(All)"}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center font-mono font-medium text-gray-900">
                                                            {asgn.periodsPerWeek || 5} p/wk
                                                        </td>
                                                        <td className="px-4 py-2.5 text-center">
                                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                                                                asgn.status === "ACTIVE" 
                                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                                                    : asgn.status === "PROPOSED"
                                                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                    : "bg-gray-50 text-gray-700 border border-gray-200"
                                                            }`}>
                                                                {asgn.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Bar */}
                                    <div className="px-4 py-2.5 border-t border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-600">
                                        <span>
                                            Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                                            <span className="font-semibold text-gray-900">{Math.min(currentPage * pageSize, filteredAssignments.length)}</span> of{" "}
                                            <span className="font-semibold text-gray-900">{filteredAssignments.length}</span> allocations
                                        </span>

                                        {totalPages > 1 && (
                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                                >
                                                    <ChevronLeft className="w-3.5 h-3.5" />
                                                </button>
                                                
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`w-6 h-6 rounded border text-[11px] font-medium transition-colors cursor-pointer ${
                                                            currentPage === page 
                                                                ? "bg-[#4085b3] text-white border-[#4085b3]" 
                                                                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}

                                                <button
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="p-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                                >
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Qualification Modal */}
            <Modal
                isOpen={qualModalOpen}
                onClose={() => setQualModalOpen(false)}
                title="Add Qualification"
            >
                <form onSubmit={handleAddQualification} className="space-y-4 text-xs">
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Qualification Level *</label>
                        <select
                            value={newQual.qualificationLevel}
                            onChange={(e: any) => setNewQual(prev => ({ ...prev, qualificationLevel: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#4085b3] outline-none"
                            required
                        >
                            <option value="CERTIFICATE">Certificate</option>
                            <option value="DIPLOMA">Diploma</option>
                            <option value="BACHELORS">Bachelor's / First Degree</option>
                            <option value="MASTERS">Master's Degree</option>
                            <option value="DOCTORATE">Doctorate / PhD</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Qualification Title *</label>
                        <input
                            type="text"
                            value={newQual.qualificationTitle}
                            onChange={(e) => setNewQual(prev => ({ ...prev, qualificationTitle: e.target.value }))}
                            placeholder="e.g. Master of Science in Physics"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Field of Study *</label>
                            <input
                                type="text"
                                value={newQual.fieldOfStudy}
                                onChange={(e) => setNewQual(prev => ({ ...prev, fieldOfStudy: e.target.value }))}
                                placeholder="e.g. Physics"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Graduation Year *</label>
                            <input
                                type="number"
                                min="1960"
                                max={new Date().getFullYear() + 1}
                                value={newQual.graduationYear}
                                onChange={(e) => setNewQual(prev => ({ ...prev, graduationYear: Number(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Institution / University *</label>
                        <input
                            type="text"
                            value={newQual.institution}
                            onChange={(e) => setNewQual(prev => ({ ...prev, institution: e.target.value }))}
                            placeholder="e.g. Addis Ababa University"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Credential Serial Number</label>
                        <input
                            type="text"
                            value={newQual.credentialNumber}
                            onChange={(e) => setNewQual(prev => ({ ...prev, credentialNumber: e.target.value }))}
                            placeholder="e.g. AAU-2022-9988"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                        />
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                        <button 
                            type="button" 
                            onClick={() => setQualModalOpen(false)}
                            className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={actionLoading}
                            className="px-4 py-1.5 bg-[#4085b3] hover:bg-[#2b6a94] text-white rounded-md transition-colors cursor-pointer"
                        >
                            Save Qualification
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Update Employment Status Modal */}
            <Modal
                isOpen={statusModalOpen}
                onClose={() => setStatusModalOpen(false)}
                title="Update Employment Status"
            >
                <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
                    <div>
                        <label className="block font-medium text-gray-700 mb-1">Employment Status *</label>
                        <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#4085b3] outline-none"
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
                        <label className="block font-medium text-gray-700 mb-1">Reason / Official Reference (Optional)</label>
                        <textarea
                            rows={3}
                            value={statusReason}
                            onChange={(e) => setStatusReason(e.target.value)}
                            placeholder="e.g. Approved leave per letter ref #9981"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                        />
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                        <button 
                            type="button" 
                            onClick={() => setStatusModalOpen(false)}
                            className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={actionLoading}
                            className="px-4 py-1.5 bg-[#4085b3] hover:bg-[#2b6a94] text-white rounded-md transition-colors cursor-pointer"
                        >
                            Save Status Change
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
