"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    ArrowLeft,
    Send,
    UploadCloud,
    Image as ImageIcon,
    FileText,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react";
import SearchableSelect, { SearchableOption } from "../ui/SearchableSelect";

export interface WoredaSchoolItem {
    id: string;
    name: string;
}

export interface WoredaHierarchyTree {
    woredaId: string;
    woredaName: string;
    totalSchools: number;
    schools: WoredaSchoolItem[];
}

interface WoredaAnnouncementPublishViewProps {
    onBack?: () => void;
    onPublished?: () => void;
    woredaName?: string;
}

export default function WoredaAnnouncementPublishView({
    onBack,
    onPublished,
    woredaName = "Woreda Education Office"
}: WoredaAnnouncementPublishViewProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [title, setTitle] = useState("");
    const [targetType, setTargetType] = useState<"ALL" | "SPECIFIC_SCHOOL">("ALL");
    const [selectedSchoolId, setSelectedSchoolId] = useState("");

    // Dates
    const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState("");

    // Content
    const [content, setContent] = useState("");

    // Attachment
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [attachmentName, setAttachmentName] = useState("");
    const [uploadingFile, setUploadingFile] = useState(false);
    const [isAcknowledgmentRequired, setIsAcknowledgmentRequired] = useState(true);

    // Hierarchy data
    const [hierarchy, setHierarchy] = useState<WoredaHierarchyTree | null>(null);
    const [loadingHierarchy, setLoadingHierarchy] = useState(true);

    // Submission & Confirmation
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successReceipt, setSuccessReceipt] = useState<{
        title: string;
        recipientsCount: number;
        notificationsCount: number;
    } | null>(null);

    // Fetch woreda subordinate schools
    useEffect(() => {
        async function loadHierarchy() {
            setLoadingHierarchy(true);
            try {
                const res = await fetchApi("/directives/recipients-tree");
                if (res.ok) {
                    const payload = await res.json();
                    if (payload.data) {
                        setHierarchy(payload.data);
                    }
                }
            } catch (err) {
                console.error("Error loading woreda school hierarchy:", err);
            } finally {
                setLoadingHierarchy(false);
            }
        }
        loadHierarchy();
    }, []);

    // Searchable Select Options
    const schoolOptions: SearchableOption[] = useMemo(() => {
        if (!hierarchy?.schools) return [];
        return hierarchy.schools.map(s => ({
            value: s.id,
            label: s.name,
            badge: "School"
        }));
    }, [hierarchy]);

    // MinIO File Upload Handler (Supports PDF, JPG, PNG)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setUploadingFile(true);

        try {
            const presignRes = await fetchApi("/storage/presign", {
                method: "POST",
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type || "application/octet-stream",
                    folder: "announcements"
                })
            });

            if (!presignRes.ok) {
                const errData = await presignRes.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to generate upload link.");
            }

            const { presignedUrl, publicUrl } = await presignRes.json();

            const uploadRes = await fetch(presignedUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": file.type || "application/octet-stream"
                },
                body: file
            });

            if (!uploadRes.ok) {
                throw new Error("Failed to upload file to storage server.");
            }

            setAttachmentUrl(publicUrl);
            setAttachmentName(file.name);
        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message || "File upload failed. Please try again.");
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    // Form Submission
    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!title.trim()) {
            setError("Please enter an announcement title.");
            return;
        }
        if (!content.trim()) {
            setError("Please write the announcement details.");
            return;
        }

        if (targetType === "SPECIFIC_SCHOOL" && !selectedSchoolId) {
            setError("Please select a target School.");
            return;
        }

        try {
            setSubmitting(true);

            let targetLevelAll = false;
            let targetLevels: string[] = [];
            let targetOrganizationUnitIds: string[] = [];
            let cascadeDescendants = false;

            if (targetType === "ALL") {
                targetLevelAll = true;
                targetLevels = ["SCHOOL"];
                targetOrganizationUnitIds = [];
                cascadeDescendants = false;
            } else if (targetType === "SPECIFIC_SCHOOL") {
                targetOrganizationUnitIds = [selectedSchoolId];
                targetLevels = ["SCHOOL"];
                cascadeDescendants = false; // Deliver to that exact school ONLY
            }

            const payload = {
                title: title.trim(),
                content: content.trim(),
                type: "DIRECTIVE",
                priority: "NORMAL",
                issueDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
                effectiveDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
                deadline: endDate ? new Date(endDate).toISOString() : undefined,
                targetLevelAll,
                targetLevels,
                targetOrganizationUnitIds,
                cascadeDescendants,
                attachmentUrl: attachmentUrl.trim() || undefined,
                attachmentName: attachmentName.trim() || undefined,
                isAcknowledgmentRequired
            };

            const res = await fetchApi("/directives", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                setSuccessReceipt({
                    title: title.trim(),
                    recipientsCount: data.data?.recipientsCount || 0,
                    notificationsCount: data.data?.notificationsCount || 0
                });
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.message || "Failed to publish announcement.");
            }
        } catch (err: any) {
            console.error("Error publishing woreda announcement:", err);
            setError("A network error occurred while publishing.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-6 px-4 font-sans text-slate-800">
            {/* Top Minimal Bar */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => (onBack ? onBack() : router.back())}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-slate-900">Publish Woreda Announcement</h1>
                        <p className="text-xs text-slate-500">Send an official circular or directive to schools in your woreda.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => (onBack ? onBack() : router.back())}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-xs cursor-pointer"
                    >
                        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{submitting ? "Sending..." : "Send Announcement"}</span>
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Main Clean Form Card */}
            <form onSubmit={handlePublish} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                {/* 1. Target Audience Hierarchy Selection */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                        Target Audience <span className="text-rose-500">*</span>
                    </label>
                    <select
                        value={targetType}
                        onChange={(e) => {
                            const val = e.target.value as any;
                            setTargetType(val);
                            setSelectedSchoolId("");
                        }}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-blue-600 font-medium text-slate-800 cursor-pointer"
                    >
                        <option value="ALL">Entire Woreda (All Schools)</option>
                        <option value="SPECIFIC_SCHOOL">Target Specific School (School Only)</option>
                    </select>

                    {/* Drill-down: Specific School (Searchable) */}
                    {targetType === "SPECIFIC_SCHOOL" && (
                        <div className="pt-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Select School <span className="text-rose-500">*</span>
                            </label>
                            <SearchableSelect
                                options={schoolOptions}
                                value={selectedSchoolId}
                                onChange={(val) => setSelectedSchoolId(val)}
                                placeholder="-- Choose or Search School --"
                                searchPlaceholder="Type school name..."
                            />
                        </div>
                    )}
                </div>

                {/* 2. Announcement Title */}
                <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                        Announcement Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Woreda Semester Assessment & Inspection Directives"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none font-medium"
                    />
                </div>

                {/* 3. Dates (Start & End Date) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">End Date (Optional)</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
                        />
                    </div>
                </div>

                {/* 4. Attachment (Image or PDF via MinIO) */}
                <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Attachment (Image or PDF)
                    </label>
                    
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                    />

                    {!attachmentUrl ? (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingFile}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                            >
                                {uploadingFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 text-blue-600" />}
                                <span>{uploadingFile ? "Uploading to storage..." : "Choose Image or PDF File"}</span>
                            </button>
                            <span className="text-2xs text-slate-400">PDF, JPG, or PNG (auto-stored via MinIO)</span>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                            <div className="flex items-center gap-2 overflow-hidden">
                                {attachmentName.toLowerCase().endsWith(".pdf") ? (
                                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                                ) : (
                                    <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />
                                )}
                                <span className="truncate font-medium text-slate-800">{attachmentName || "Attached Document"}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setAttachmentUrl("");
                                    setAttachmentName("");
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                title="Remove file"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* 5. Details / Message Content */}
                <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                        Announcement Details <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                        required
                        rows={5}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Write the full announcement message, directives, and guidelines here..."
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    />
                </div>

                {/* 6. Acknowledgment & Status Confirmation Toggle */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-100 bg-blue-50/50">
                    <input
                        type="checkbox"
                        id="requireAckToggleWoreda"
                        checked={isAcknowledgmentRequired}
                        onChange={(e) => setIsAcknowledgmentRequired(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="requireAckToggleWoreda" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                        Track Delivery & Require Recipient Confirmation
                        <span className="block text-2xs font-normal text-slate-500 mt-0.5">
                            School administrators receive an interactive &quot;Confirm Receipt&quot; prompt, and live delivery status (Seen / Read / Confirmed) will appear on your announcement ledger.
                        </span>
                    </label>
                </div>

                {/* 7. Footer Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => (onBack ? onBack() : router.back())}
                        className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || uploadingFile}
                        className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-xs cursor-pointer"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        <span>{submitting ? "Publishing..." : "Send Announcement"}</span>
                    </button>
                </div>
            </form>

            {/* Success Modal */}
            {successReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
                    <div className="w-full max-w-sm rounded-xl border border-slate-100 bg-white p-5 shadow-xl space-y-3.5 text-center">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Announcement Sent!</h3>
                            <p className="mt-0.5 text-xs text-slate-500">
                                &quot;{successReceipt.title}&quot; has been published to {successReceipt.recipientsCount} recipient schools.
                            </p>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setSuccessReceipt(null);
                                    setTitle("");
                                    setContent("");
                                    setAttachmentUrl("");
                                    setAttachmentName("");
                                    setSelectedSchoolId("");
                                }}
                                className="flex-1 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                            >
                                Send Another
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSuccessReceipt(null);
                                    if (onPublished) onPublished();
                                    else if (onBack) onBack();
                                }}
                                className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-xs cursor-pointer"
                            >
                                View in Registry
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
