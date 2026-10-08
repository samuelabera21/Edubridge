"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchApi } from "../../lib/api";
import * as XLSX from "xlsx";
import {
    ArrowLeft,
    FileSpreadsheet,
    ExternalLink,
    RefreshCw,
    CheckCircle2,
    Clock,
    AlertTriangle,
    XCircle,
    Building2,
    School,
    Check,
    X,
    MessageSquare,
    Loader2,
    Calendar,
    Target,
    Shield,
    Copy,
    Link2,
    ChevronDown,
    ChevronUp,
    Eye,
    Download,
    Search,
    Table,
    List,
    FileText,
    Zap,
    Code2
} from "lucide-react";

export interface DataRequestDetailViewProps {
    requestId: string;
    onBack?: () => void;
}

export default function DataRequestDetailView({
    requestId,
    onBack
}: DataRequestDetailViewProps) {
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Syncing state
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ totalFetched: number; createdCount: number; updatedCount: number } | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);

    // Search and status filter
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "SUBMITTED" | "ACCEPTED" | "PENDING">("ALL");

    // Expanded submission answers row
    const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);

    // Review modal state
    const [reviewModalSubmission, setReviewModalSubmission] = useState<any>(null);
    const [reviewDecision, setReviewDecision] = useState<"ACCEPTED" | "RETURNED">("ACCEPTED");
    const [reviewComment, setReviewComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    // Load Data Request Detail
    const loadDetail = async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const res = await fetchApi(`/data-requests/${requestId}`);
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load data request details");
            }
            const json = await res.json();
            setRequest(json.data);
        } catch (err: any) {
            console.error("Failed to load Data Request detail:", err);
            setError(err.message || "Failed to fetch Data Request");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        if (requestId) {
            loadDetail();
        }
    }, [requestId]);

    // Live background auto-refresh every 15s when Google Form is active
    useEffect(() => {
        if (!requestId || !request?.googleForm?.responderUri) return;

        const interval = setInterval(() => {
            loadDetail(true);
        }, 15000);

        return () => clearInterval(interval);
    }, [requestId, request?.googleForm?.responderUri]);

    // Trigger Google Form sync
    const handleSyncResponses = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetchApi(`/data-requests/${requestId}/sync`, {
                method: "POST"
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to sync responses from Google Forms");
            }
            const json = await res.json();
            setSyncResult(json.data);
            await loadDetail(true);
        } catch (err: any) {
            console.error("Response sync failed:", err);
            setError(err.message || "Failed to sync responses from Google Forms.");
        } finally {
            setSyncing(false);
        }
    };

    // Review Submission
    const handleReviewSubmission = async () => {
        if (!reviewModalSubmission) return;

        setSubmittingReview(true);
        try {
            const res = await fetchApi(`/data-requests/submissions/${reviewModalSubmission.id}/review`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: reviewDecision,
                    reviewComment: reviewComment.trim() || undefined
                })
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to submit review");
            }

            setReviewModalSubmission(null);
            setReviewComment("");
            await loadDetail(true);
        } catch (err: any) {
            console.error("Review submission failed:", err);
            setError(err.message || "Failed to submit review.");
        } finally {
            setSubmittingReview(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
    };

    // Export responses to CSV
    const handleExportCSV = () => {
        if (!request) return;

        const fields: any[] = request.fields || [];
        const targets: any[] = request.targets || [];
        const submissions: any[] = request.submissions || [];

        // Build CSV Headers
        const headers = [
            "Target Organization Unit",
            "Administrative Level",
            "Submission Status",
            "Submission Date",
            ...fields.map((f) => `"${f.label.replace(/"/g, '""')}"`),
            "Review Status",
            "Reviewer Feedback"
        ];

        // Build CSV Rows
        const rows = targets.map((target) => {
            const submission = submissions.find((s) => s.organizationId === target.organizationId);
            const answers = submission?.responseData || {};

            const questionValues = fields.map((f) => {
                const val = answers[f.label] ?? answers[f.id] ?? "";
                const cleanStr = String(val ?? "").replace(/"/g, '""');
                return `"${cleanStr}"`;
            });

            const submittedDate = submission?.submittedAt
                ? new Date(submission.submittedAt).toISOString()
                : "";

            return [
                `"${(target.organization?.name || "").replace(/"/g, '""')}"`,
                `"${target.organization?.type || ""}"`,
                `"${target.status || "PENDING"}"`,
                `"${submittedDate}"`,
                ...questionValues,
                `"${submission?.status || ""}"`,
                `"${(submission?.reviewComment || "").replace(/"/g, '""')}"`
            ].join(",");
        });

        const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${request.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_responses.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Export responses to Excel (.xlsx) with styled metadata banner and formatted columns
    const handleExportExcel = () => {
        if (!request) return;

        const fields: any[] = request.fields || [];
        const targets: any[] = request.targets || [];
        const submissions: any[] = request.submissions || [];

        const wb = XLSX.utils.book_new();

        // 1. Title and Metadata Rows
        const sheetData: any[][] = [
            ["EduBridge Education Information System — Data Request Submissions Report"],
            [],
            ["Request Title:", request.title],
            ["Priority:", `${request.priority} Priority`, "Status:", request.status],
            ["Issued By:", request.createdOrganization?.name || "EduBridge Platform", "Generated On:", new Date().toLocaleString()],
            ["Start Date:", new Date(request.startDate).toLocaleDateString(), "Submission Deadline:", new Date(request.deadline).toLocaleDateString()],
            ["Completion Progress:", `${submittedTargets} / ${totalTargets} (${completionRate}%)`],
            [],
            // Table Header Row
            [
                "Organization Unit",
                "Administrative Level",
                "Status",
                "Submitted Timestamp",
                ...fields.map((f: any) => f.label),
                "Review Status",
                "Reviewer Feedback"
            ]
        ];

        // 2. Data Rows
        targets.forEach((target: any) => {
            const submission = submissions.find((s: any) => s.organizationId === target.organizationId);
            const answers = submission?.responseData || {};

            const questionValues = fields.map((f: any) => {
                const val = answers[f.label] ?? answers[f.id] ?? "";
                return val !== undefined && val !== null ? String(val) : "";
            });

            const submittedTimestamp = submission?.submittedAt
                ? new Date(submission.submittedAt).toLocaleString()
                : "Pending";

            sheetData.push([
                target.organization?.name || "",
                target.organization?.type || "",
                target.status || "PENDING",
                submittedTimestamp,
                ...questionValues,
                submission?.status || "",
                submission?.reviewComment || ""
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);

        // 3. Auto-fit column widths
        const colWidths = sheetData.reduce((acc: number[], row: any[]) => {
            row.forEach((cell, i) => {
                const len = cell ? String(cell).length : 10;
                acc[i] = Math.max(acc[i] || 12, Math.min(len + 3, 50));
            });
            return acc;
        }, []);
        ws["!cols"] = colWidths.map((w: number) => ({ wch: w }));

        XLSX.utils.book_append_sheet(wb, ws, "Consolidated Responses");
        const fileName = `${request.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_consolidated_report.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    if (loading) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
                <Loader2 className="w-7 h-7 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">Loading data request & live submissions...</p>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-xl mx-auto text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Unable to load Data Request</h3>
                <p className="text-xs text-slate-500">{error || "Data Request not found or access denied."}</p>
                <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
                >
                    Back to Data Requests
                </button>
            </div>
        );
    }

    const getEffectiveStatus = (t: any, sub: any) => {
        const subStatus = String(sub?.status || "").toUpperCase();
        const targetStatus = String(t?.status || "").toUpperCase();
        if (subStatus === "ACCEPTED" || targetStatus === "ACCEPTED") return "ACCEPTED";
        if (subStatus === "RETURNED" || targetStatus === "RETURNED") return "RETURNED";
        if (subStatus === "SUBMITTED" || subStatus === "UNDER_REVIEW" || subStatus === "RESUBMITTED" || targetStatus === "SUBMITTED" || !!sub) return "SUBMITTED";
        return "PENDING";
    };

    const totalTargets = request.targets?.length || 0;
    const acceptedTargets = (request.targets || []).filter((t: any) => {
        const sub = (request.submissions || []).find((s: any) => s.organizationId === t.organizationId);
        return getEffectiveStatus(t, sub) === "ACCEPTED";
    }).length;
    const submittedTargets = (request.targets || []).filter((t: any) => {
        const sub = (request.submissions || []).find((s: any) => s.organizationId === t.organizationId);
        const st = getEffectiveStatus(t, sub);
        return st === "SUBMITTED" || st === "ACCEPTED";
    }).length;
    const pendingTargets = totalTargets - submittedTargets;
    const completionRate = totalTargets > 0 ? Math.round((submittedTargets / totalTargets) * 100) : 0;
    const fields = request.fields || [];

    // Filter targets for table
    const filteredTargets = (request.targets || []).filter((t: any) => {
        const sub = (request.submissions || []).find((s: any) => s.organizationId === t.organizationId);
        const effectiveStatus = getEffectiveStatus(t, sub);

        if (statusFilter === "SUBMITTED" && effectiveStatus !== "SUBMITTED" && effectiveStatus !== "ACCEPTED") return false;
        if (statusFilter === "ACCEPTED" && effectiveStatus !== "ACCEPTED") return false;
        if (statusFilter === "PENDING" && effectiveStatus !== "PENDING") return false;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return (
                t.organization?.name?.toLowerCase().includes(q) ||
                t.organization?.type?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-10">
            {/* Top Navigation Bar with Quick Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Data Requests</span>
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                    {request.googleForm?.responderUri && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold shadow-2xs" title="EduBridge automatically synchronizes live responses in the background">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>Live Auto-Sync Active</span>
                        </div>
                    )}

                    {request.isCreatedByMe && request.googleForm?.responderUri && (
                        <button
                            type="button"
                            onClick={handleSyncResponses}
                            disabled={syncing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 disabled:opacity-50 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
                            title="Force an instant synchronization right now"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-blue-600" : "text-slate-500"}`} />
                            <span>{syncing ? "Syncing..." : "Sync Now"}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Sync Notification Banner */}
            {syncResult && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 shadow-2xs">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                            <strong>Sync complete:</strong> Retrieved {syncResult.totalFetched} response(s) from Google Forms ({syncResult.createdCount} new submission(s) recorded, {syncResult.updatedCount} updated).
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSyncResult(null)}
                        className="text-emerald-700 hover:text-emerald-900 p-0.5 rounded cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Official Data Request Summary Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                                request.priority === "URGENT" || request.priority === "HIGH"
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}>
                                {request.priority} Priority
                            </span>

                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                                request.status === "PUBLISHED"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                                {request.status}
                            </span>

                            <span className="text-slate-400">•</span>

                            <span className="text-slate-600 text-xs">
                                Issued by <strong className="text-slate-900 font-semibold">{request.createdOrganization?.name || "EduBridge Platform"}</strong>
                            </span>
                        </div>

                        <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
                            {request.title}
                        </h1>

                        {request.objective && request.objective.trim() !== request.title.trim() && (
                            <p className="text-xs text-slate-600 max-w-4xl leading-relaxed">
                                {request.objective}
                            </p>
                        )}
                    </div>

                    {/* Open Form CTA Button inside the card */}
                    {request.googleForm?.responderUri && (
                        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-2xs shrink-0 self-start">
                            <a
                                href={request.googleForm.responderUri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Open Form</span>
                            </a>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(request.googleForm.responderUri)}
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-md transition-colors cursor-pointer ml-0.5"
                                title="Copy Form URL"
                            >
                                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    )}
                </div>

                {/* Key Metrics / Attributes Strip */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                        <span className="text-slate-400 text-[11px] block">Start Date</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                            {new Date(request.startDate).toLocaleDateString()}
                        </span>
                    </div>

                    <div>
                        <span className="text-slate-400 text-[11px] block">Submission Deadline</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                            {new Date(request.deadline).toLocaleDateString()}
                        </span>
                    </div>

                    <div>
                        <span className="text-slate-400 text-[11px] block">Target Units</span>
                        <span className="font-semibold text-slate-800 mt-0.5 block">
                            {totalTargets} organization unit(s)
                        </span>
                    </div>

                    <div>
                        <span className="text-slate-400 text-[11px] block">Completion Progress</span>
                        <span className="font-semibold text-blue-700 mt-0.5 block">
                            {submittedTargets} / {totalTargets} ({completionRate}%)
                        </span>
                    </div>
                </div>
            </div>

            {/* Consolidated Submissions Table Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3 p-4">
                {/* Clean Unified Government Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Table className="w-4 h-4 text-blue-600" />
                            <span>Submissions & Responses</span>
                        </h2>
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                            {totalTargets}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <div className="relative w-full sm:w-56">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filter by unit..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-blue-500"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={handleExportCSV}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
                                title="Export CSV"
                            >
                                <Download className="w-3.5 h-3.5 text-slate-500" />
                                <span>CSV</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleExportExcel}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
                                title="Export Excel (.xlsx)"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Excel (.xlsx)</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs Strip */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                        type="button"
                        onClick={() => setStatusFilter("ALL")}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            statusFilter === "ALL"
                                ? "bg-slate-900 text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        All Units ({totalTargets})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("SUBMITTED")}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            statusFilter === "SUBMITTED"
                                ? "bg-slate-900 text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Submitted ({submittedTargets})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("ACCEPTED")}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            statusFilter === "ACCEPTED"
                                ? "bg-slate-900 text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Accepted ({acceptedTargets})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("PENDING")}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            statusFilter === "PENDING"
                                ? "bg-slate-900 text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        Pending ({pendingTargets})
                    </button>
                </div>

                {/* Main Clean Data Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">Organization Unit</th>
                                <th className="px-3 py-3 whitespace-nowrap">Level</th>
                                <th className="px-3 py-3 whitespace-nowrap">Status</th>
                                {fields.map((f: any) => (
                                    <th key={f.id} className="px-4 py-3 text-slate-900 font-semibold" title={f.label}>
                                        {f.label}
                                    </th>
                                ))}
                                <th className="px-3 py-3 whitespace-nowrap">Submitted Date</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTargets.length === 0 ? (
                                <tr>
                                    <td colSpan={fields.length + 5} className="px-4 py-10 text-center text-slate-400 text-xs">
                                        No matching organization units found.
                                    </td>
                                </tr>
                            ) : (
                                filteredTargets.map((target: any) => {
                                    const submission = (request.submissions || []).find((s: any) => s.organizationId === target.organizationId);
                                    const answers = submission?.responseData || {};
                                    const effectiveStatus = getEffectiveStatus(target, submission);

                                    return (
                                        <tr key={target.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                                                {target.organization?.name}
                                            </td>
                                            <td className="px-3 py-3 text-slate-600 font-medium uppercase text-[11px] whitespace-nowrap">
                                                {target.organization?.type}
                                            </td>
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <div className="space-y-0.5">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                                        effectiveStatus === "ACCEPTED"
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : effectiveStatus === "SUBMITTED"
                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                            : effectiveStatus === "RETURNED"
                                                            ? "bg-red-50 text-red-700 border border-red-200"
                                                            : "bg-slate-100 text-slate-600 border border-slate-200"
                                                    }`}>
                                                        {effectiveStatus === "ACCEPTED" ? "Accepted" : effectiveStatus === "RETURNED" ? "Returned" : effectiveStatus === "SUBMITTED" ? "Under Review" : "Pending"}
                                                    </span>
                                                    {submission?.reviewComment && (
                                                        <span className="block text-[10px] text-slate-500 italic max-w-xs truncate" title={submission.reviewComment}>
                                                            Note: {submission.reviewComment}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Dynamic Question Answers */}
                                            {fields.map((f: any) => {
                                                const rawVal = answers[f.label] ?? answers[f.id];
                                                const hasAnswer = rawVal !== undefined && rawVal !== null && rawVal !== "";
                                                return (
                                                    <td key={f.id} className="px-4 py-3 text-slate-900 font-medium">
                                                        {hasAnswer ? (
                                                            <span className="block break-words">
                                                                {String(rawVal)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 italic text-[11px]">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            <td className="px-3 py-3 text-slate-600 whitespace-nowrap text-[11px]">
                                                {submission ? (
                                                    <span>{new Date(submission.submittedAt).toLocaleString()}</span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Pending</span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                {submission && request.isCreatedByMe && (
                                                    effectiveStatus === "ACCEPTED" ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setReviewComment(submission.reviewComment || "");
                                                                setReviewModalSubmission(submission);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                                                            title="Click to update note"
                                                        >
                                                            <Check className="w-3 h-3 text-emerald-600" />
                                                            <span>Accepted</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setReviewComment(submission.reviewComment || "");
                                                                setReviewModalSubmission(submission);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            <span>Accept</span>
                                                        </button>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Accept Submission Modal */}
            {reviewModalSubmission && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl text-slate-900">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                                    <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Accept Submission: {reviewModalSubmission.organization?.name}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReviewModalSubmission(null)}
                                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Submission Answers Preview */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-52 overflow-y-auto space-y-2">
                            {Object.entries(reviewModalSubmission.responseData || {}).map(([key, val]: any) => (
                                <div key={key} className="text-xs">
                                    <span className="text-slate-500 block font-medium">{key}</span>
                                    <span className="text-slate-900 font-semibold">{String(val)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-700">
                                Review Note / Feedback (Optional)
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Add optional official remarks (e.g., Verified, Approved, Good)..."
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-blue-500 resize-none shadow-xs"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setReviewModalSubmission(null)}
                                className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleReviewSubmission}
                                disabled={submittingReview}
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>{submittingReview ? "Accepting..." : "Confirm & Accept"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


