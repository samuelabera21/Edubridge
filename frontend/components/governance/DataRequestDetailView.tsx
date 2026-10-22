"use client";

import React, { useState, useEffect } from "react";
import { fetchApi } from "../../lib/api";
import * as XLSX from "xlsx";
import {
    ArrowLeft,
    FileSpreadsheet,
    RefreshCw,
    CheckCircle2,
    Check,
    X,
    Copy,
    Download,
    Search,
    Paperclip,
    ArrowUpRight,
    Building2,
    Calendar,
    Clock,
    FileText
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

    // Option 1: Response Inspection Drawer state
    const [inspectingTarget, setInspectingTarget] = useState<any | null>(null);
    const [reviewDecision, setReviewDecision] = useState<"ACCEPTED" | "RETURNED">("ACCEPTED");
    const [reviewComment, setReviewComment] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);
    const [reviewSuccessMessage, setReviewSuccessMessage] = useState<string | null>(null);

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
            setError(err.message || "Failed to fetch data request.");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        if (requestId) {
            loadDetail();
        }
    }, [requestId]);

    // When selecting a target to inspect, sync review fields
    useEffect(() => {
        if (inspectingTarget && request?.submissions) {
            const sub = request.submissions.find((s: any) => s.organizationId === inspectingTarget.organizationId);
            if (sub) {
                setReviewDecision(sub.status === "RETURNED" ? "RETURNED" : "ACCEPTED");
                setReviewComment(sub.reviewComment || "");
            } else {
                setReviewDecision("ACCEPTED");
                setReviewComment("");
            }
            setReviewSuccessMessage(null);
        }
    }, [inspectingTarget, request?.submissions]);

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

    // Review Submission directly from the Inspection Drawer
    const handleReviewFromDrawer = async () => {
        if (!inspectingTarget) return;
        const sub = (request?.submissions || []).find((s: any) => s.organizationId === inspectingTarget.organizationId);
        if (!sub) return;

        setSubmittingReview(true);
        setReviewSuccessMessage(null);
        try {
            const res = await fetchApi(`/data-requests/submissions/${sub.id}/review`, {
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

            setReviewSuccessMessage(
                reviewDecision === "ACCEPTED"
                    ? "Submission marked as Accepted."
                    : "Submission returned for revision."
            );
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

        const headers = [
            "Target Organization Unit",
            "Administrative Level",
            "Submission Status",
            "Submission Date",
            ...fields.map((f) => `"${f.label.replace(/"/g, '""')}"`),
            "Review Status",
            "Reviewer Feedback"
        ];

        const rows = targets.map((target) => {
            const submission = submissions.find((s) => s.organizationId === target.organizationId);
            const answers = submission?.responseData || {};

            const questionValues = fields.map((f) => {
                const val = answers[f.label] ?? answers[f.id] ?? "";
                let formatted = String(val ?? "");
                if (formatted.includes(":::")) {
                    const [fn, url] = formatted.split(":::");
                    formatted = `${fn.trim()} (${url.trim()})`;
                }
                const cleanStr = formatted.replace(/"/g, '""');
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

    // Export responses to Excel (.xlsx)
    const handleExportExcel = () => {
        if (!request) return;

        const fields: any[] = request.fields || [];
        const targets: any[] = request.targets || [];
        const submissions: any[] = request.submissions || [];

        const wb = XLSX.utils.book_new();

        const sheetData: any[][] = [
            ["EduBridge Education Information System — Data Request Submissions Report"],
            [],
            ["Request Title:", request.title],
            ["Priority:", `${request.priority} Priority`, "Status:", request.status],
            ["Issued By:", request.createdOrganization?.name || "EduBridge Platform", "Generated On:", new Date().toLocaleString()],
            ["Start Date:", new Date(request.startDate).toLocaleDateString(), "Submission Deadline:", new Date(request.deadline).toLocaleDateString()],
            ["Completion Progress:", `${submittedTargets} / ${totalTargets} (${completionRate}%)`],
            [],
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

        targets.forEach((target: any) => {
            const submission = submissions.find((s: any) => s.organizationId === target.organizationId);
            const answers = submission?.responseData || {};

            const questionValues = fields.map((f: any) => {
                const val = answers[f.label] ?? answers[f.id] ?? "";
                let formatted = String(val ?? "");
                if (formatted.includes(":::")) {
                    const [fn, url] = formatted.split(":::");
                    formatted = `${fn.trim()} (${url.trim()})`;
                }
                return formatted;
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
            <div className="py-20 text-center text-slate-500 font-sans">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#4085b3] mb-2" />
                <span className="text-sm font-medium">Loading data request and submissions...</span>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="p-6 border-l-4 border-rose-600 bg-rose-50 text-slate-900 text-sm max-w-xl mx-auto space-y-3 font-sans">
                <p className="font-semibold">Unable to load data request:</p>
                <p className="text-xs text-slate-600">{error || "Data request not found or access denied."}</p>
                <button
                    type="button"
                    onClick={onBack}
                    className="text-xs font-semibold text-[#4085b3] hover:underline cursor-pointer"
                >
                    ← Back to data requests
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

    // Clean, authentic government cell value renderer without neon badge styles
    const renderAnswerValue = (rawVal: any) => {
        if (rawVal === undefined || rawVal === null || rawVal === "") {
            return <span className="text-slate-400 text-xs italic">No response provided</span>;
        }
        const str = String(rawVal);
        if (str.includes("drive.google.com") || str.includes(":::http")) {
            const fileParts = str.split(",").map(s => s.trim()).filter(Boolean);
            return (
                <div className="flex flex-col gap-1.5 items-start">
                    {fileParts.map((part, idx) => {
                        let fileName = "Uploaded Attachment";
                        let fileUrl = part;
                        if (part.includes(":::")) {
                            const chunks = part.split(":::");
                            fileName = chunks[0].trim();
                            fileUrl = chunks[1].trim();
                        } else if (part.startsWith("http")) {
                            fileUrl = part;
                            fileName = "Open File (Google Drive)";
                        }
                        return (
                            <a
                                key={idx}
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#4085b3] hover:underline font-medium cursor-pointer"
                                title={`Open ${fileName} in Google Drive`}
                            >
                                <Paperclip className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate">{fileName}</span>
                                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </a>
                        );
                    })}
                </div>
            );
        }
        return <span className="block break-words text-sm text-slate-900 leading-relaxed">{str}</span>;
    };

    // Helper to compile all question-response pairs for the drawer
    const getQuestionItems = (target: any) => {
        if (!target) return [];
        const sub = (request?.submissions || []).find((s: any) => s.organizationId === target.organizationId);
        if (!sub) return [];
        const answers = sub.responseData || {};
        const items: { label: string; value: any }[] = [];
        const seenKeys = new Set<string>();

        // 1. Defined fields from the request
        if (request.fields && Array.isArray(request.fields)) {
            request.fields.forEach((f: any) => {
                const val = answers[f.label] ?? answers[f.id];
                seenKeys.add(f.label);
                seenKeys.add(f.id);
                items.push({
                    label: f.label || "Question",
                    value: val
                });
            });
        }

        // 2. Any additional keys in responseData that were not in pre-defined fields
        Object.entries(answers).forEach(([key, val]) => {
            if (!seenKeys.has(key)) {
                items.push({
                    label: key,
                    value: val
                });
            }
        });

        return items;
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

    const activeInspectingSubmission = inspectingTarget
        ? (request?.submissions || []).find((s: any) => s.organizationId === inspectingTarget.organizationId)
        : null;
    const activeInspectingStatus = inspectingTarget
        ? getEffectiveStatus(inspectingTarget, activeInspectingSubmission)
        : "PENDING";
    const inspectingQuestionItems = inspectingTarget ? getQuestionItems(inspectingTarget) : [];

    return (
        <div className="space-y-6 font-sans text-slate-900 max-w-7xl">
            {/* Top Navigation & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to data requests</span>
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                    {request.googleForm?.responderUri && (
                        <span className="text-xs text-slate-600 inline-flex items-center gap-1.5 mr-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                            <span>Live sync active</span>
                        </span>
                    )}

                    {request.isCreatedByMe && request.googleForm?.responderUri && (
                        <button
                            type="button"
                            onClick={handleSyncResponses}
                            disabled={syncing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 hover:text-slate-900 disabled:opacity-50 text-xs font-medium rounded transition-colors cursor-pointer"
                            title="Force an instant synchronization right now"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-[#4085b3]" : "text-slate-500"}`} />
                            <span>{syncing ? "Syncing..." : "Sync now"}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Sync Notification Banner if any */}
            {syncResult && (
                <div role="status" className="p-3 bg-slate-50 border border-slate-200 text-slate-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                            <strong>Sync complete:</strong> Retrieved {syncResult.totalFetched} response(s) from Google Forms ({syncResult.createdCount} new recorded, {syncResult.updatedCount} updated).
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSyncResult(null)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                        aria-label="Dismiss sync banner"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* 1. OFFICIAL DATA REQUEST HEADER & GOV.UK SUMMARY */}
            <div className="space-y-4">
                <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-mono uppercase tracking-wider">
                            REF: REQ-{request.id ? request.id.substring(0, 8).toUpperCase() : ""}
                        </span>
                        <span>·</span>
                        <span className="font-medium text-slate-700">
                            {request.status ? request.status.charAt(0) + request.status.slice(1).toLowerCase() : "Published"}
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {request.title}
                    </h1>

                    {request.objective && request.objective.trim() !== request.title.trim() && (
                        <p className="text-sm text-slate-700 mt-2 max-w-4xl leading-relaxed">
                            {request.objective}
                        </p>
                    )}
                </div>

                {/* GOV.UK Standard Summary List */}
                <dl className="divide-y divide-slate-200 border-t border-b border-slate-200 text-sm">
                    <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <dt className="text-slate-600 font-medium">Issuing authority</dt>
                        <dd className="sm:col-span-2 text-slate-900">
                            {request.createdOrganization?.name || "EduBridge Platform"}
                        </dd>
                    </div>

                    <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <dt className="text-slate-600 font-medium">Target scope</dt>
                        <dd className="sm:col-span-2 text-slate-900">
                            {totalTargets} organization unit(s)
                        </dd>
                    </div>

                    <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <dt className="text-slate-600 font-medium">Submission deadline</dt>
                        <dd className="sm:col-span-2 text-slate-900 tabular-nums">
                            {request.deadline
                                ? new Date(request.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                : "—"}
                        </dd>
                    </div>

                    <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <dt className="text-slate-600 font-medium">Priority</dt>
                        <dd className="sm:col-span-2 text-slate-900">
                            {request.priority ? request.priority.charAt(0) + request.priority.slice(1).toLowerCase() : "Normal"}
                        </dd>
                    </div>

                    <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <dt className="text-slate-600 font-medium">Responses progress</dt>
                        <dd className="sm:col-span-2 text-slate-900 tabular-nums">
                            {submittedTargets} of {totalTargets} ({completionRate}%)
                        </dd>
                    </div>

                    {request.googleForm?.responderUri && (
                        <div className="py-3 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                            <dt className="text-slate-600 font-medium">Online form</dt>
                            <dd className="sm:col-span-2 flex items-center gap-3">
                                <a
                                    href={request.googleForm.responderUri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-semibold text-[#4085b3] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                >
                                    <span>Open Google Form</span>
                                    <ArrowUpRight className="w-4 h-4" />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(request.googleForm.responderUri)}
                                    className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1 border border-slate-300 rounded hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1"
                                >
                                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                                    <span>{copiedLink ? "Copied" : "Copy link"}</span>
                                </button>
                            </dd>
                        </div>
                    )}
                </dl>
            </div>

            {/* 2. SUBMISSIONS & RESPONSES REGISTRY (Option 1: Clean Tracking Table with zero horizontal scroll) */}
            <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-slate-900">
                            Submissions and responses
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Status and submitted returns across all targeted administrative units
                        </p>
                    </div>

                    {/* Bulk Export Actions */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportCSV}
                            className="px-3 py-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors cursor-pointer inline-flex items-center gap-1.5"
                            title="Export responses as CSV"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>Export CSV</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="px-3 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-medium rounded transition-colors cursor-pointer inline-flex items-center gap-1.5"
                            title="Export consolidated report as Excel (.xlsx)"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Export Excel (.xlsx)</span>
                        </button>
                    </div>
                </div>

                {/* Filter Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search by organization unit..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                        />
                    </div>

                    <div className="w-48">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            aria-label="Filter submissions by status"
                            className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                        >
                            <option value="ALL">All statuses ({totalTargets})</option>
                            <option value="SUBMITTED">Submitted ({submittedTargets})</option>
                            <option value="ACCEPTED">Accepted ({acceptedTargets})</option>
                            <option value="PENDING">Pending ({pendingTargets})</option>
                        </select>
                    </div>
                </div>

                {/* OPTION 1 TABLE: Zero horizontal scrolling — strictly fits all screens */}
                <div className="border-t border-slate-200 overflow-hidden">
                    <table className="w-full table-fixed text-left text-sm border-collapse">
                        <caption className="sr-only">Submissions and returns registry</caption>
                        <thead>
                            <tr className="border-b-2 border-slate-300 text-xs font-semibold text-slate-700">
                                <th scope="col" className="py-3 pr-3 font-semibold w-[36%]">Organization unit</th>
                                <th scope="col" className="py-3 px-3 font-semibold w-[16%] whitespace-nowrap">Level</th>
                                <th scope="col" className="py-3 px-3 font-semibold w-[16%] whitespace-nowrap">Status</th>
                                <th scope="col" className="py-3 px-3 font-semibold w-[18%] whitespace-nowrap">Submitted date</th>
                                <th scope="col" className="py-3 pl-3 pr-1 font-semibold w-[14%] text-right whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredTargets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                                        No matching organization units found.
                                    </td>
                                </tr>
                            ) : (
                                filteredTargets.map((target: any) => {
                                    const submission = (request.submissions || []).find((s: any) => s.organizationId === target.organizationId);
                                    const effectiveStatus = getEffectiveStatus(target, submission);
                                    const statusText = effectiveStatus === "ACCEPTED" ? "Accepted" : effectiveStatus === "RETURNED" ? "Returned" : effectiveStatus === "SUBMITTED" ? "Submitted" : "Pending";

                                    return (
                                        <tr
                                            key={target.id}
                                            onClick={() => setInspectingTarget(target)}
                                            className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                                        >
                                            {/* Organization Unit */}
                                            <td className="py-3.5 pr-3 overflow-hidden">
                                                <span
                                                    className="font-semibold text-slate-900 text-sm block truncate group-hover:text-[#4085b3] transition-colors"
                                                    title={target.organization?.name}
                                                >
                                                    {target.organization?.name}
                                                </span>
                                            </td>

                                            {/* Level */}
                                            <td className="py-3.5 px-3 text-xs text-slate-700 whitespace-nowrap">
                                                {target.organization?.type ? target.organization.type.charAt(0) + target.organization.type.slice(1).toLowerCase() : "—"}
                                            </td>

                                            {/* Status (Plain text, no badges) */}
                                            <td className="py-3.5 px-3 text-xs text-slate-700 whitespace-nowrap">
                                                <span className="font-medium">{statusText}</span>
                                                {submission?.reviewComment && (
                                                    <span className="block text-[11px] text-slate-500 max-w-[140px] truncate" title={submission.reviewComment}>
                                                        Note: {submission.reviewComment}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Submitted Date */}
                                            <td className="py-3.5 px-3 text-xs text-slate-700 tabular-nums whitespace-nowrap">
                                                {submission?.submittedAt
                                                    ? new Date(submission.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                                                    : "—"}
                                            </td>

                                            {/* Action Link */}
                                            <td className="py-3.5 pl-3 pr-1 text-right whitespace-nowrap">
                                                <span className="text-xs font-semibold text-[#4085b3] group-hover:underline inline-flex items-center gap-0.5">
                                                    <span>{submission ? "View response" : "View status"}</span>
                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* OPTION 1: RESPONSE INSPECTION DRAWER (DfE / GOV.UK Pattern) */}
            {inspectingTarget && (
                <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="submission-drawer-title">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 transition-opacity"
                        onClick={() => setInspectingTarget(null)}
                    />

                    {/* Drawer Panel */}
                    <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl flex flex-col z-50 border-l border-slate-300 overflow-hidden font-sans">
                        {/* Header */}
                        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/90 flex items-start justify-between gap-4 shrink-0">
                            <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap text-xs text-slate-500">
                                    <span className="font-mono uppercase tracking-wider">
                                        SUBMISSION DOCKET · {inspectingTarget.organization?.type || "UNIT"}
                                    </span>
                                    <span>·</span>
                                    <span className="font-medium text-slate-800">
                                        {activeInspectingStatus === "ACCEPTED"
                                            ? "Accepted"
                                            : activeInspectingStatus === "RETURNED"
                                            ? "Returned"
                                            : activeInspectingStatus === "SUBMITTED"
                                            ? "Submitted"
                                            : "Pending submission"}
                                    </span>
                                </div>
                                <h2
                                    id="submission-drawer-title"
                                    className="text-xl font-bold text-slate-900 leading-snug break-words"
                                >
                                    {inspectingTarget.organization?.name}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => setInspectingTarget(null)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
                                aria-label="Close drawer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">
                            {/* Success Notification if reviewed */}
                            {reviewSuccessMessage && (
                                <div role="status" className="p-3 bg-emerald-50 border-l-4 border-emerald-600 text-emerald-900 text-xs flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>{reviewSuccessMessage}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReviewSuccessMessage(null)}
                                        className="text-emerald-700 hover:text-emerald-900 p-0.5 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Summary Metadata List */}
                            <dl className="divide-y divide-slate-200 border-t border-b border-slate-200 text-sm">
                                <div className="py-2.5 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Organization</dt>
                                    <dd className="col-span-2 text-slate-900 font-semibold">{inspectingTarget.organization?.name}</dd>
                                </div>
                                <div className="py-2.5 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Administrative level</dt>
                                    <dd className="col-span-2 text-slate-900">
                                        {inspectingTarget.organization?.type
                                            ? inspectingTarget.organization.type.charAt(0) + inspectingTarget.organization.type.slice(1).toLowerCase()
                                            : "—"}
                                    </dd>
                                </div>
                                <div className="py-2.5 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Submission time</dt>
                                    <dd className="col-span-2 text-slate-900 tabular-nums">
                                        {activeInspectingSubmission?.submittedAt
                                            ? new Date(activeInspectingSubmission.submittedAt).toLocaleDateString("en-GB", {
                                                  day: "numeric",
                                                  month: "short",
                                                  year: "numeric",
                                                  hour: "2-digit",
                                                  minute: "2-digit"
                                              })
                                            : "Pending submission"}
                                    </dd>
                                </div>
                                <div className="py-2.5 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Review status</dt>
                                    <dd className="col-span-2 text-slate-900 font-medium">
                                        {activeInspectingStatus === "ACCEPTED"
                                            ? "Accepted"
                                            : activeInspectingStatus === "RETURNED"
                                            ? "Returned for revision"
                                            : activeInspectingStatus === "SUBMITTED"
                                            ? "Under review"
                                            : "Pending submission"}
                                    </dd>
                                </div>
                                {activeInspectingSubmission?.reviewComment && (
                                    <div className="py-2.5 grid grid-cols-3 gap-2">
                                        <dt className="text-slate-600 font-medium">Reviewer remarks</dt>
                                        <dd className="col-span-2 text-slate-800 text-xs leading-relaxed italic bg-slate-50 p-2 rounded border border-slate-200">
                                            "{activeInspectingSubmission.reviewComment}"
                                        </dd>
                                    </div>
                                )}
                            </dl>

                            {/* Case A: Unit Has NOT Submitted Yet */}
                            {!activeInspectingSubmission && (
                                <div className="p-4 border border-slate-200 bg-slate-50 text-sm space-y-2">
                                    <h3 className="font-semibold text-slate-900">Awaiting return</h3>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        This organization unit has not submitted its questionnaire responses yet. The statutory submission deadline is{" "}
                                        <strong className="text-slate-900">
                                            {request.deadline
                                                ? new Date(request.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                                : "as specified in the request"}
                                        </strong>.
                                    </p>
                                </div>
                            )}

                            {/* Case B: Unit HAS Submitted -> Complete Question-by-Question Response Document */}
                            {activeInspectingSubmission && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                            Submitted responses ({inspectingQuestionItems.length})
                                        </h3>
                                    </div>

                                    {inspectingQuestionItems.length === 0 ? (
                                        <p className="text-xs text-slate-500 italic">No question fields recorded in this return.</p>
                                    ) : (
                                        <div className="space-y-3.5">
                                            {inspectingQuestionItems.map((item, idx) => (
                                                <div key={idx} className="space-y-1">
                                                    <span className="text-xs font-semibold text-slate-700 block">
                                                        {idx + 1}. {item.label}
                                                    </span>
                                                    <div className="p-3 bg-slate-50 border-l-3 border-[#4085b3] text-sm text-slate-900 rounded-r">
                                                        {renderAnswerValue(item.value)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Review Action Panel (Only if user is desk creator & submission exists) */}
                            {request.isCreatedByMe && activeInspectingSubmission && (
                                <div className="border-t border-slate-200 pt-5 space-y-3">
                                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Verification decision
                                    </h3>

                                    {/* Decision Toggle Tabs */}
                                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded text-xs font-medium">
                                        <button
                                            type="button"
                                            onClick={() => setReviewDecision("ACCEPTED")}
                                            className={`py-1.5 px-3 rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                                reviewDecision === "ACCEPTED"
                                                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                                                    : "text-slate-600 hover:text-slate-900"
                                            }`}
                                        >
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Accept submission</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReviewDecision("RETURNED")}
                                            className={`py-1.5 px-3 rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                                reviewDecision === "RETURNED"
                                                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                                                    : "text-slate-600 hover:text-slate-900"
                                            }`}
                                        >
                                            <X className="w-3.5 h-3.5 text-rose-600" />
                                            <span>Return for revision</span>
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-700">
                                            Review remarks {reviewDecision === "RETURNED" ? "(Required for revision)" : "(Optional)"}
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder={
                                                reviewDecision === "RETURNED"
                                                    ? "Specify what needs correction or missing documentation..."
                                                    : "Add optional remarks..."
                                            }
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={handleReviewFromDrawer}
                                            disabled={submittingReview}
                                            className="px-4 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white rounded text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                                        >
                                            {submittingReview ? (
                                                <>
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                    <span>Saving...</span>
                                                </>
                                            ) : (
                                                <span>
                                                    {reviewDecision === "ACCEPTED" ? "Confirm & accept" : "Confirm & return"}
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
