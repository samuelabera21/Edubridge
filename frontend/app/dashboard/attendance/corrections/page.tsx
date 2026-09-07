"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    CheckCircle2, 
    FileCheck, 
    Search, 
    Clock, 
    AlertTriangle, 
    UserCheck, 
    ShieldCheck, 
    X, 
    Edit3,
    Plus,
    XCircle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AcademicYear } from "@/types/api";

type AttendanceCorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";

interface CorrectionItem {
    id: string;
    attendanceId?: string | null;
    enrollmentId: string;
    date: string;
    originalStatus: string;
    requestedStatus: string;
    reasonCategory: string;
    justification: string;
    evidenceDocumentUrl?: string | null;
    status: AttendanceCorrectionStatus;
    rejectionReason?: string | null;
    studentName: string;
    admissionNumber: string;
    gradeName: string;
    sectionName: string;
    classPeriodName: string;
    requestedBy?: { id: string; name: string } | null;
    reviewedBy?: { id: string; name: string } | null;
    reviewedAt?: string | null;
    createdAt: string;
}

export default function AttendanceCorrectionsPage() {
    const { authData } = useAuth();

    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");

    const [corrections, setCorrections] = useState<CorrectionItem[]>([]);
    const [summary, setSummary] = useState<{ total: number; pendingCount: number; approvedCount: number; rejectedCount: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [page, setPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const limit = 20;

    // Review Modal State (Approve / Reject)
    const [reviewItem, setReviewItem] = useState<CorrectionItem | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

    // New Correction Request Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchStudentQuery, setSearchStudentQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [searchingStudents, setSearchingStudents] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        date: new Date().toISOString().split("T")[0],
        originalStatus: "ABSENT",
        requestedStatus: "EXCUSED",
        reasonCategory: "Medical Exemption",
        justification: "",
        evidenceDocumentUrl: ""
    });
    const [creatingRequest, setCreatingRequest] = useState(false);

    // Load academic years
    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetchApi("/academic/years");
                if (res.ok) {
                    const data: AcademicYear[] = await res.json();
                    setYears(data);
                    const active = data.find(y => y.status === "ACTIVE");
                    if (active) setSelectedYearId(active.id);
                }
            } catch (e) {
                console.error(e);
            }
        };
        init();
    }, []);

    const loadCorrections = async (isManual = false) => {
        try {
            if (isManual) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const q = new URLSearchParams();
            if (selectedYearId) q.set("academicYearId", selectedYearId);
            if (statusFilter !== "ALL") q.set("status", statusFilter);
            q.set("page", page.toString());
            q.set("limit", limit.toString());

            const res = await fetchApi(`/attendance/admin/corrections?${q.toString()}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to load attendance corrections");
            }

            const data = await res.json();
            setCorrections(data.data || []);
            setSummary(data.summary || null);
            setTotalPages(data.pagination?.totalPages || 1);
        } catch (err: any) {
            setError(err.message || "Failed to load corrections");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadCorrections();
    }, [selectedYearId, statusFilter, page]);

    // Handle Approve
    const handleApprove = async (item: CorrectionItem) => {
        try {
            setActionLoading(true);
            const res = await fetchApi(`/attendance/admin/corrections/${item.id}/approve`, {
                method: "POST"
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to approve correction");
            }

            setActionSuccessMsg(`Correction for ${item.studentName} approved and attendance updated.`);
            loadCorrections();
            setTimeout(() => {
                setReviewItem(null);
                setActionSuccessMsg(null);
            }, 1200);
        } catch (err: any) {
            alert(err.message || "Approval failed");
        } finally {
            setActionLoading(false);
        }
    };

    // Handle Reject
    const handleReject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewItem || !rejectionReason.trim()) return;

        try {
            setActionLoading(true);
            const res = await fetchApi(`/attendance/admin/corrections/${reviewItem.id}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rejectionReason: rejectionReason.trim() })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to reject correction");
            }

            setActionSuccessMsg(`Correction request rejected with official reason.`);
            loadCorrections();
            setTimeout(() => {
                setReviewItem(null);
                setRejecting(false);
                setRejectionReason("");
                setActionSuccessMsg(null);
            }, 1200);
        } catch (err: any) {
            alert(err.message || "Rejection failed");
        } finally {
            setActionLoading(false);
        }
    };

    // Student Search for New Override Request
    const handleSearchStudents = async () => {
        if (!searchStudentQuery.trim()) return;
        try {
            setSearchingStudents(true);
            const q = new URLSearchParams({
                search: searchStudentQuery.trim(),
                limit: "5"
            });
            if (selectedYearId) q.set("academicYearId", selectedYearId);

            const res = await fetchApi(`/attendance/admin/students?${q.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data.data || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSearchingStudents(false);
        }
    };

    // Submit New Correction Request
    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !selectedYearId) return;

        try {
            setCreatingRequest(true);
            const res = await fetchApi("/attendance/admin/corrections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    enrollmentId: selectedStudent.enrollmentId,
                    academicYearId: selectedYearId,
                    date: createFormData.date,
                    originalStatus: createFormData.originalStatus,
                    requestedStatus: createFormData.requestedStatus,
                    reasonCategory: createFormData.reasonCategory,
                    justification: createFormData.justification,
                    evidenceDocumentUrl: createFormData.evidenceDocumentUrl || undefined
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to file correction request");
            }

            setIsCreateModalOpen(false);
            setSelectedStudent(null);
            setSearchStudentQuery("");
            setSearchResults([]);
            setCreateFormData({
                date: new Date().toISOString().split("T")[0],
                originalStatus: "ABSENT",
                requestedStatus: "EXCUSED",
                reasonCategory: "Medical Exemption",
                justification: "",
                evidenceDocumentUrl: ""
            });
            loadCorrections();
        } catch (err: any) {
            alert(err.message || "Failed to submit request");
        } finally {
            setCreatingRequest(false);
        }
    };

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <span>Attendance Corrections & Overrides</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Attendance adjustments, medical exemptions, and audit log
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    {years.length > 0 && (
                        <select
                            value={selectedYearId}
                            onChange={(e) => { setSelectedYearId(e.target.value); setPage(1); }}
                            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium shadow-sm focus:ring-2 focus:ring-[#006b3f]"
                        >
                            {years.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.name} {y.status === "ACTIVE" ? "(Active)" : ""}
                                </option>
                            ))}
                        </select>
                    )}
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-8 px-3 text-xs bg-[#006b3f] hover:bg-[#005a34] text-white flex items-center space-x-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Override</span>
                    </Button>
                </div>
            </div>

            {/* Status Metric Ribbons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div 
                    onClick={() => { setStatusFilter("PENDING"); setPage(1); }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        statusFilter === "PENDING"
                            ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</span>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{summary?.pendingCount || 0}</p>
                </div>

                <div 
                    onClick={() => { setStatusFilter("APPROVED"); setPage(1); }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        statusFilter === "APPROVED"
                            ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</span>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{summary?.approvedCount || 0}</p>
                </div>

                <div 
                    onClick={() => { setStatusFilter("REJECTED"); setPage(1); }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        statusFilter === "REJECTED"
                            ? "bg-red-50 border-red-300 ring-2 ring-red-400"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rejected</span>
                    <p className="text-2xl font-bold text-red-600 mt-1">{summary?.rejectedCount || 0}</p>
                </div>

                <div 
                    onClick={() => { setStatusFilter("ALL"); setPage(1); }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        statusFilter === "ALL"
                            ? "bg-gray-50 border-gray-400 ring-2 ring-gray-400"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                    }`}
                >
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total</span>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{summary?.totalCount || 0}</p>
                </div>
            </div>

            {/* Corrections & Audit Table */}
            <Card className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Attendance Correction Requests & Audit Log
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadCorrections(true)}
                        disabled={refreshing}
                        className="flex items-center space-x-1"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12">
                            <LoadingState message="Loading attendance correction requests..." />
                        </div>
                    ) : error ? (
                        <div className="p-8">
                            <ErrorState message={error} onRetry={() => loadCorrections()} />
                        </div>
                    ) : corrections.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="font-bold text-gray-700">No attendance corrections logged</p>
                            <p className="text-xs text-gray-500 mt-1">Pending and authorized overrides will appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Student</th>
                                        <th className="px-4 py-3 font-semibold">Class / Section</th>
                                        <th className="px-4 py-3 font-semibold">Target Date</th>
                                        <th className="px-4 py-3 font-semibold">Status Change</th>
                                        <th className="px-4 py-3 font-semibold">Reason Category</th>
                                        <th className="px-4 py-3 font-semibold">Request State</th>
                                        <th className="px-4 py-3 font-semibold">Requested By</th>
                                        <th className="px-6 py-3 font-semibold text-right">Review</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {corrections.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <p className="font-bold text-gray-900">{item.studentName}</p>
                                                <p className="text-xs font-mono text-gray-500">{item.admissionNumber}</p>
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-gray-700">
                                                {item.gradeName} - {item.sectionName}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs font-medium text-gray-800">
                                                {item.date}
                                            </td>
                                            <td className="px-4 py-3.5 text-xs font-bold">
                                                <span className="text-red-700">{item.originalStatus}</span>
                                                <span className="mx-1 text-gray-400">➔</span>
                                                <span className="text-emerald-700">{item.requestedStatus}</span>
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-gray-700">
                                                <span className="font-medium">{item.reasonCategory}</span>
                                                <p className="text-[11px] text-gray-400 truncate max-w-xs">{item.justification}</p>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                                    item.status === "APPROVED"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : item.status === "REJECTED"
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-amber-100 text-amber-800"
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-gray-500">
                                                {item.requestedBy?.name || "System"}
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                {item.status === "PENDING" ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => {
                                                            setReviewItem(item);
                                                            setRejecting(false);
                                                            setRejectionReason("");
                                                            setActionSuccessMsg(null);
                                                        }}
                                                        className="bg-[#006b3f] hover:bg-[#005a34] text-white text-xs"
                                                    >
                                                        Review Request
                                                    </Button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setReviewItem(item);
                                                            setRejecting(false);
                                                        }}
                                                        className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                                                    >
                                                        View Details
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                                Page {page} of {totalPages}
                            </p>
                            <div className="flex items-center space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Review & Authorization Modal */}
            {reviewItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-150">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                                <ShieldCheck className="w-5 h-5 text-[#006b3f]" />
                                <span>Review Attendance Correction</span>
                            </h3>
                            <button
                                onClick={() => setReviewItem(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {actionSuccessMsg ? (
                                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm font-semibold flex items-center">
                                    <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
                                    {actionSuccessMsg}
                                </div>
                            ) : (
                                <>
                                    <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 font-bold uppercase">Student</span>
                                            <span className="font-bold text-gray-900">{reviewItem.studentName} ({reviewItem.admissionNumber})</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 font-bold uppercase">Class & Section</span>
                                            <span className="font-semibold text-gray-800">{reviewItem.gradeName} - {reviewItem.sectionName}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 font-bold uppercase">Date of Record</span>
                                            <span className="font-semibold text-gray-800">{reviewItem.date}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 font-bold uppercase">Requested Transition</span>
                                            <span className="font-bold">
                                                <span className="text-red-700">{reviewItem.originalStatus}</span> ➔ <span className="text-emerald-700">{reviewItem.requestedStatus}</span>
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 font-bold uppercase">Reason Category</span>
                                            <span className="font-semibold text-gray-800">{reviewItem.reasonCategory}</span>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200">
                                            <span className="text-gray-500 font-bold uppercase block mb-1">Teacher Justification:</span>
                                            <p className="text-gray-700 font-normal italic">&ldquo;{reviewItem.justification}&rdquo;</p>
                                        </div>
                                        {reviewItem.rejectionReason && (
                                            <div className="pt-2 border-t border-red-100 text-red-700">
                                                <span className="font-bold block mb-1">Rejection Reason:</span>
                                                <p className="italic">{reviewItem.rejectionReason}</p>
                                            </div>
                                        )}
                                    </div>

                                    {reviewItem.status === "PENDING" && (
                                        <>
                                            {rejecting ? (
                                                <form onSubmit={handleReject} className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs font-bold text-red-700 mb-1">
                                                            Reason for Rejection (Required for Audit)
                                                        </label>
                                                        <textarea
                                                            rows={3}
                                                            required
                                                            value={rejectionReason}
                                                            onChange={(e) => setRejectionReason(e.target.value)}
                                                            placeholder="State why this correction cannot be authorized..."
                                                            className="w-full p-2.5 text-xs border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end space-x-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() => setRejecting(false)}
                                                        >
                                                            Back
                                                        </Button>
                                                        <Button
                                                            type="submit"
                                                            disabled={actionLoading}
                                                            className="bg-red-600 hover:bg-red-700 text-white"
                                                        >
                                                            {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                                                        </Button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <div className="flex items-center justify-end space-x-3 pt-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => setRejecting(true)}
                                                        className="text-red-700 border-red-200 hover:bg-red-50"
                                                    >
                                                        Reject Request
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={() => handleApprove(reviewItem)}
                                                        disabled={actionLoading}
                                                        className="bg-[#006b3f] hover:bg-[#005a34] text-white"
                                                    >
                                                        {actionLoading ? "Approving..." : "Approve & Update Attendance"}
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* New Official Override / Request Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-150">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                                <Edit3 className="w-5 h-5 text-[#006b3f]" />
                                <span>Submit Official Attendance Correction</span>
                            </h3>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
                            {/* Step 1: Select Student */}
                            {!selectedStudent ? (
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-gray-700">
                                        Find Enrolled Student
                                    </label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            placeholder="Type student name or admission #..."
                                            value={searchStudentQuery}
                                            onChange={(e) => setSearchStudentQuery(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchStudents(); } }}
                                            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg"
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleSearchStudents}
                                            disabled={searchingStudents}
                                            className="bg-gray-800 text-white text-xs"
                                        >
                                            {searchingStudents ? "Searching..." : "Search"}
                                        </Button>
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                                            {searchResults.map((s) => (
                                                <div
                                                    key={s.enrollmentId}
                                                    onClick={() => setSelectedStudent(s)}
                                                    className="p-3 text-xs hover:bg-emerald-50 cursor-pointer flex items-center justify-between"
                                                >
                                                    <div>
                                                        <p className="font-bold text-gray-900">{s.studentName}</p>
                                                        <p className="text-gray-500">{s.admissionNumber} • {s.gradeName} - {s.sectionName}</p>
                                                    </div>
                                                    <span className="text-[#006b3f] font-semibold text-xs">Select</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                                    <div>
                                        <p className="font-bold text-emerald-950">{selectedStudent.studentName}</p>
                                        <p className="text-emerald-700">{selectedStudent.admissionNumber} • {selectedStudent.gradeName} - {selectedStudent.sectionName}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStudent(null)}
                                        className="text-emerald-800 font-bold hover:underline"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}

                            {selectedStudent && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Target Date</label>
                                            <input
                                                type="date"
                                                required
                                                value={createFormData.date}
                                                onChange={(e) => setCreateFormData({ ...createFormData, date: e.target.value })}
                                                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Reason Category</label>
                                            <select
                                                value={createFormData.reasonCategory}
                                                onChange={(e) => setCreateFormData({ ...createFormData, reasonCategory: e.target.value })}
                                                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white"
                                            >
                                                <option value="Medical Exemption">Medical Exemption</option>
                                                <option value="Official Representation / Sports">Official Representation / Sports</option>
                                                <option value="Bereavement / Family Emergency">Bereavement / Family Emergency</option>
                                                <option value="Administrative Logging Correction">Administrative Logging Correction</option>
                                                <option value="Approved Leave of Absence">Approved Leave of Absence</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Original Status</label>
                                            <select
                                                value={createFormData.originalStatus}
                                                onChange={(e) => setCreateFormData({ ...createFormData, originalStatus: e.target.value })}
                                                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white"
                                            >
                                                <option value="ABSENT">Absent</option>
                                                <option value="LATE">Late</option>
                                                <option value="PRESENT">Present</option>
                                                <option value="EXCUSED">Excused</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Corrected Status</label>
                                            <select
                                                value={createFormData.requestedStatus}
                                                onChange={(e) => setCreateFormData({ ...createFormData, requestedStatus: e.target.value })}
                                                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white"
                                            >
                                                <option value="EXCUSED">Excused</option>
                                                <option value="PRESENT">Present</option>
                                                <option value="LATE">Late</option>
                                                <option value="ABSENT">Absent</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Official Justification / Reference Notes
                                        </label>
                                        <textarea
                                            rows={3}
                                            required
                                            value={createFormData.justification}
                                            onChange={(e) => setCreateFormData({ ...createFormData, justification: e.target.value })}
                                            placeholder="Provide hospital reference number, event authorization, or official basis..."
                                            className="w-full p-2.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                        />
                                    </div>

                                    <div className="flex justify-end space-x-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setIsCreateModalOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={creatingRequest}
                                            className="bg-[#006b3f] hover:bg-[#005a34] text-white"
                                        >
                                            {creatingRequest ? "Filing..." : "Submit Correction Request"}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
