"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import {
    FileText,
    Upload,
    Video,
    FileSpreadsheet,
    File,
    Download,
    ExternalLink,
    Search,
    Filter,
    RefreshCw,
    Trash2,
    Calendar,
    Users,
    CheckCircle2,
    Play,
    Plus,
    X,
    Clock,
    BookOpen,
    Eye,
    Layers,
    AlertCircle,
    Check
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

interface MaterialItem {
    id: string;
    organizationId: string;
    teacherId?: string | null;
    teachingAssignmentId?: string | null;
    title: string;
    description?: string | null;
    materialType: "DOCUMENT" | "VIDEO";
    fileType?: "PDF" | "WORD" | "POWERPOINT" | "VIDEO" | "OTHER" | null;
    fileUrl: string;
    fileName: string;
    fileSize?: number | null;
    videoUrl?: string | null;
    unitName?: string | null;
    subjectName?: string | null;
    gradeName?: string | null;
    sectionName?: string | null;
    createdAt: string;
}

function formatVideoEmbedUrl(url?: string | null): string {
    if (!url) return "";
    const clean = url.trim();
    if (clean.includes("youtube.com/watch?v=")) {
        const id = clean.split("watch?v=")[1]?.split("&")[0];
        return `https://www.youtube.com/embed/${id}`;
    }
    if (clean.includes("youtube.com/shorts/")) {
        const id = clean.split("shorts/")[1]?.split("?")[0]?.split("/")[0];
        return `https://www.youtube.com/embed/${id}`;
    }
    if (clean.includes("youtu.be/")) {
        const id = clean.split("youtu.be/")[1]?.split("?")[0];
        return `https://www.youtube.com/embed/${id}`;
    }
    return clean;
}

export default function TeacherCurriculumPage() {
    // Data State
    const [materials, setMaterials] = useState<MaterialItem[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "DOCUMENT" | "VIDEO">("ALL");
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("ALL");

    // Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form State
    const [formMaterialType, setFormMaterialType] = useState<"DOCUMENT" | "VIDEO">("DOCUMENT");
    const [formClassId, setFormClassId] = useState<string>("");
    const [formTitle, setFormTitle] = useState<string>("");
    const [formUnitName, setFormUnitName] = useState<string>("");
    const [formDescription, setFormDescription] = useState<string>("");
    const [formVideoUrl, setFormVideoUrl] = useState<string>("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Video Player Modal
    const [activeVideoModal, setActiveVideoModal] = useState<MaterialItem | null>(null);

    // Load initial data
    const loadData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const [materialsRes, classesRes] = await Promise.all([
                fetchApi("/teacher/curriculum/materials"),
                fetchApi("/teacher/my-classes")
            ]);

            if (materialsRes.ok) {
                const data = await materialsRes.json();
                setMaterials(Array.isArray(data) ? data : []);
            } else {
                setMaterials([]);
            }

            if (classesRes.ok) {
                const cData = await classesRes.json();
                const classList = Array.isArray(cData) ? cData : [];
                setClasses(classList);
                if (classList.length > 0 && !formClassId) {
                    const firstId = classList[0].assignment?.id || classList[0].id;
                    setFormClassId(firstId);
                }
            }
        } catch (err: any) {
            console.error("Failed to load materials workspace:", err);
            setError(err.message || "Failed to load learning materials");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [formClassId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle File Selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            if (!formTitle.trim()) {
                // Auto-fill title from file name without extension
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                setFormTitle(nameWithoutExt);
            }
        }
    };

    // Determine File Type
    const getFileTypeCategory = (fileName: string, mimeType?: string): "PDF" | "WORD" | "POWERPOINT" | "VIDEO" | "OTHER" => {
        const lower = fileName.toLowerCase();
        if (lower.endsWith(".pdf") || mimeType?.includes("pdf")) return "PDF";
        if (lower.endsWith(".doc") || lower.endsWith(".docx") || mimeType?.includes("word")) return "WORD";
        if (lower.endsWith(".ppt") || lower.endsWith(".pptx") || mimeType?.includes("presentation") || mimeType?.includes("powerpoint")) return "POWERPOINT";
        if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mkv") || lower.endsWith(".mov") || mimeType?.includes("video")) return "VIDEO";
        return "OTHER";
    };

    // Format file size
    const formatBytes = (bytes?: number | null) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Submit New Material
    const handlePostMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            alert("Please enter a title for the material.");
            return;
        }

        if (formMaterialType === "DOCUMENT" && !selectedFile) {
            alert("Please select a document file (PDF, Word, or PowerPoint).");
            return;
        }

        if (formMaterialType === "VIDEO" && !selectedFile && !formVideoUrl.trim()) {
            alert("Please select a video file or provide a video tutorial URL.");
            return;
        }

        setSubmitting(true);
        try {
            // Find class details
            const activeClass = classes.find(c => (c.assignment?.id || c.id) === formClassId);
            const assignment = activeClass?.assignment || activeClass || {};
            const gradeLevel = assignment.schoolGrade?.grade?.level ? `Grade ${assignment.schoolGrade.grade.level}` : (activeClass?.gradeLevel || "");
            const sectionName = assignment.section?.name || activeClass?.section?.name || "";
            const subjectName = assignment.subject?.name || activeClass?.subject?.name || "";

            let fileUrl = "";
            let fileName = "";
            let fileSize = 0;
            let fileTypeCategory: "PDF" | "WORD" | "POWERPOINT" | "VIDEO" | "OTHER" = "OTHER";

            if (selectedFile) {
                fileName = selectedFile.name;
                fileSize = selectedFile.size;
                fileTypeCategory = getFileTypeCategory(fileName, selectedFile.type);

                // Upload file to MinIO via storage presigned URL
                const presignRes = await fetchApi("/storage/presign", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileName: selectedFile.name,
                        contentType: selectedFile.type || (fileTypeCategory === "PDF" ? "application/pdf" : "application/octet-stream"),
                        mimeType: selectedFile.type || "application/octet-stream",
                        fileSize: selectedFile.size,
                        folder: "curriculum/materials"
                    })
                });

                if (!presignRes.ok) {
                    const errData = await presignRes.json().catch(() => ({}));
                    throw new Error(errData.error || "Failed to generate storage upload URL");
                }

                const data = await presignRes.json();
                const uploadUrl = data.presignedUrl || data.uploadUrl;
                const publicUrl = data.publicUrl || data.downloadUrl;

                if (!uploadUrl || !publicUrl) {
                    throw new Error("Invalid response received from storage service");
                }

                const uploadRes = await fetch(uploadUrl, {
                    method: "PUT",
                    headers: { "Content-Type": selectedFile.type || "application/octet-stream" },
                    body: selectedFile
                });

                if (!uploadRes.ok) {
                    throw new Error("Failed to upload file content to storage");
                }

                fileUrl = publicUrl;
            } else if (formVideoUrl.trim()) {
                fileUrl = formVideoUrl.trim();
                fileName = formTitle.trim();
                fileTypeCategory = "VIDEO";
            }

            const payload = {
                teachingAssignmentId: formClassId || undefined,
                title: formTitle.trim(),
                description: formDescription.trim() || undefined,
                materialType: formMaterialType,
                fileType: fileTypeCategory,
                fileUrl: fileUrl || formVideoUrl.trim() || "#",
                fileName: fileName || formTitle.trim(),
                fileSize: fileSize || undefined,
                videoUrl: formMaterialType === "VIDEO" ? (formVideoUrl.trim() || fileUrl) : undefined,
                unitName: formUnitName.trim() || undefined,
                subjectName: subjectName || undefined,
                gradeName: gradeLevel || undefined,
                sectionName: sectionName || undefined
            };

            const res = await fetchApi("/teacher/curriculum/materials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to post learning material");
            }

            setSuccessMsg(`"${formTitle.trim()}" posted successfully!`);
            setIsUploadModalOpen(false);
            setFormTitle("");
            setFormUnitName("");
            setFormDescription("");
            setFormVideoUrl("");
            setSelectedFile(null);
            loadData(true);

            setTimeout(() => setSuccessMsg(null), 5000);
        } catch (err: any) {
            alert(err.message || "Failed to post material");
        } finally {
            setSubmitting(false);
        }
    };

    // Delete Material
    const handleDeleteMaterial = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to remove "${title}"?`)) return;

        try {
            const res = await fetchApi(`/teacher/curriculum/materials/${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setMaterials(prev => prev.filter(m => m.id !== id));
            } else {
                throw new Error("Failed to delete material");
            }
        } catch (err: any) {
            alert(err.message || "Failed to delete material");
        }
    };

    // Filtered Materials
    const filteredMaterials = useMemo(() => {
        return materials.filter(item => {
            const q = searchQuery.toLowerCase().trim();
            const matchesQuery = !q || (
                item.title.toLowerCase().includes(q) ||
                (item.description && item.description.toLowerCase().includes(q)) ||
                (item.unitName && item.unitName.toLowerCase().includes(q)) ||
                (item.fileName && item.fileName.toLowerCase().includes(q)) ||
                (item.subjectName && item.subjectName.toLowerCase().includes(q))
            );

            const matchesType = typeFilter === "ALL" || item.materialType === typeFilter;
            const matchesClass = selectedAssignmentId === "ALL" || item.teachingAssignmentId === selectedAssignmentId;

            return matchesQuery && matchesType && matchesClass;
        });
    }, [materials, searchQuery, typeFilter, selectedAssignmentId]);

    // KPI Metrics
    const totalMaterials = materials.length;
    const documentCount = materials.filter(m => m.materialType === "DOCUMENT").length;
    const videoCount = materials.filter(m => m.materialType === "VIDEO").length;
    const uniqueClasses = new Set(materials.map(m => m.teachingAssignmentId).filter(Boolean)).size;

    // Helper for badge color based on file format
    const getBadgeInfo = (item: MaterialItem) => {
        if (item.materialType === "VIDEO") {
            return {
                label: "Video Tutorial",
                icon: Video,
                className: "bg-indigo-50 text-indigo-700 border-indigo-200"
            };
        }
        switch (item.fileType) {
            case "PDF":
                return {
                    label: "PDF Document",
                    icon: FileText,
                    className: "bg-rose-50 text-rose-700 border-rose-200"
                };
            case "WORD":
                return {
                    label: "Word Document",
                    icon: FileText,
                    className: "bg-blue-50 text-blue-700 border-blue-200"
                };
            case "POWERPOINT":
                return {
                    label: "PowerPoint Presentation",
                    icon: FileSpreadsheet,
                    className: "bg-amber-50 text-amber-700 border-amber-200"
                };
            default:
                return {
                    label: "Course Document",
                    icon: File,
                    className: "bg-slate-50 text-slate-700 border-slate-200"
                };
        }
    };

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800 pb-16 font-sans">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#4085b3] flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-900 leading-tight">Learning Resources</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsUploadModalOpen(true)}
                        className="px-3.5 py-2 rounded-lg bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer shadow-2xs"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Post Material</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => loadData(true)}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer"
                        title="Reload materials"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Success Notification */}
            {successMsg && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-[#4085b3] flex items-center justify-between text-xs shadow-2xs animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span className="font-semibold">{successMsg}</span>
                    </div>
                    <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Top 4 KPI Cards: Left-to-right clean blue hover fill matching results page */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Materials */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Total Materials
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {totalMaterials}
                        </span>
                    </div>
                    <BookOpen className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                </div>

                {/* 2. Documents */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Documents (Word/PDF/PPT)
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {documentCount}
                        </span>
                    </div>
                    <FileText className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                </div>

                {/* 3. Video Tutorials */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Video Tutorials
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {videoCount}
                        </span>
                    </div>
                    <Video className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                </div>

                {/* 4. Active Classes Covered */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Classes Covered
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {uniqueClasses || classes.length}
                        </span>
                    </div>
                    <Users className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                </div>
            </div>

            {/* Filter Bar */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                {/* Search */}
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                        type="text"
                        placeholder="Search material title, unit, or file name..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#4085b3]"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Type Filter Buttons */}
                <div className="flex items-center gap-1.5 self-start md:self-auto">
                    <button
                        type="button"
                        onClick={() => setTypeFilter("ALL")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            typeFilter === "ALL"
                                ? "bg-[#4085b3] text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        onClick={() => setTypeFilter("DOCUMENT")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            typeFilter === "DOCUMENT"
                                ? "bg-[#4085b3] text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Documents</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTypeFilter("VIDEO")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                            typeFilter === "VIDEO"
                                ? "bg-[#4085b3] text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        <Video className="w-3.5 h-3.5" />
                        <span>Video Tutorials</span>
                    </button>
                </div>

                {/* Assigned Class Selector */}
                {classes.length > 0 && (
                    <div className="w-full md:w-auto">
                        <select
                            value={selectedAssignmentId}
                            onChange={e => setSelectedAssignmentId(e.target.value)}
                            className="w-full md:w-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-[#4085b3]"
                        >
                            <option value="ALL">All Assigned Classes</option>
                            {classes.map((cls: any) => {
                                const id = cls.assignment?.id || cls.id;
                                const grade = cls.assignment?.schoolGrade?.grade?.level ? `Grade ${cls.assignment.schoolGrade.grade.level}` : (cls.gradeLevel || "");
                                const section = cls.assignment?.section?.name || cls.section?.name || "";
                                const subject = cls.assignment?.subject?.name || cls.subject?.name || "";
                                return (
                                    <option key={id} value={id}>
                                        {grade} {section ? `- Section ${section}` : ""} ({subject})
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}
            </div>

            {/* Materials Grid */}
            {loading ? (
                <div className="w-full p-16 text-center text-gray-500 flex flex-col justify-center items-center">
                    <div className="w-10 h-10 rounded-full border-3 border-[#4085b3]/20 border-t-[#4085b3] animate-spin mb-3"></div>
                    <p className="text-xs font-semibold text-slate-600">Loading learning materials...</p>
                </div>
            ) : filteredMaterials.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#4085b3] flex items-center justify-center mx-auto">
                        <Upload className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">No Learning Materials Found</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Post course documents (Word, PDF, PowerPoint) or tutorial videos for your students.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsUploadModalOpen(true)}
                        className="px-4 py-2 bg-[#4085b3] text-white rounded-lg text-xs font-semibold hover:bg-[#32698e] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Post Your First Material</span>
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMaterials.map(item => {
                        const badge = getBadgeInfo(item);
                        const BadgeIcon = badge.icon;
                        const isVideo = item.materialType === "VIDEO";

                        return (
                            <div
                                key={item.id}
                                className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-[#4085b3] hover:shadow-xs transition-all duration-200 group"
                            >
                                <div className="space-y-3">
                                    {/* Top Row: Badge & Date */}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${badge.className}`}>
                                            <BadgeIcon className="w-3 h-3" />
                                            <span>{badge.label}</span>
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </span>
                                    </div>

                                    {/* Title & Description */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#4085b3] transition-colors line-clamp-1">
                                            {item.title}
                                        </h3>
                                        {item.unitName && (
                                            <p className="text-[11px] font-semibold text-[#4085b3] mt-0.5">
                                                Unit / Topic: {item.unitName}
                                            </p>
                                        )}
                                        {item.description && (
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                {item.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Class Tag */}
                                    {(item.gradeName || item.subjectName) && (
                                        <div className="p-2 bg-slate-50 rounded-lg text-[11px] font-medium text-slate-600 flex items-center justify-between">
                                            <span>{item.gradeName} {item.sectionName ? `• Sec ${item.sectionName}` : ""}</span>
                                            <span className="font-semibold text-slate-800">{item.subjectName}</span>
                                        </div>
                                    )}

                                    {/* File Info */}
                                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
                                        <span className="truncate max-w-[180px] font-medium">{item.fileName}</span>
                                        {item.fileSize && <span>{formatBytes(item.fileSize)}</span>}
                                    </div>
                                </div>

                                {/* Actions Row */}
                                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-3">
                                    {isVideo ? (
                                        <button
                                            type="button"
                                            onClick={() => setActiveVideoModal(item)}
                                            className="px-3 py-1.5 rounded-lg bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        >
                                            <Play className="w-3.5 h-3.5" />
                                            <span>Watch Tutorial</span>
                                        </button>
                                    ) : (
                                        <a
                                            href={item.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#4085b3] hover:text-white text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>Open / Download</span>
                                        </a>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => handleDeleteMaterial(item.id, item.title)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                        title="Delete material"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Video Player Modal */}
            {activeVideoModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">{activeVideoModal.title}</h3>
                                {activeVideoModal.unitName && (
                                    <p className="text-xs text-[#4085b3] font-medium">{activeVideoModal.unitName}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setActiveVideoModal(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 bg-black">
                            {activeVideoModal.videoUrl && (activeVideoModal.videoUrl.includes("youtube.com") || activeVideoModal.videoUrl.includes("youtu.be")) ? (
                                <iframe
                                    src={formatVideoEmbedUrl(activeVideoModal.videoUrl)}
                                    className="w-full aspect-video rounded-lg"
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    title={activeVideoModal.title}
                                />
                            ) : (
                                <video
                                    src={activeVideoModal.videoUrl || activeVideoModal.fileUrl}
                                    controls
                                    className="w-full aspect-video rounded-lg bg-black"
                                    autoPlay
                                />
                            )}
                        </div>
                        <div className="p-4 flex items-center justify-between text-xs text-slate-500">
                            <span>{activeVideoModal.gradeName} {activeVideoModal.sectionName ? `• Section ${activeVideoModal.sectionName}` : ""} ({activeVideoModal.subjectName})</span>
                            <button
                                onClick={() => setActiveVideoModal(null)}
                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Post Material Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#4085b3] flex items-center justify-center">
                                    <Upload className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900">Post Learning Material</h3>
                            </div>
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handlePostMaterial} className="p-5 space-y-4 text-xs">
                            {/* Material Type Switcher */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Material Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormMaterialType("DOCUMENT")}
                                        className={`p-3 rounded-xl border text-center font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                            formMaterialType === "DOCUMENT"
                                                ? "border-[#4085b3] bg-blue-50/60 text-[#4085b3]"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <FileText className="w-4 h-4" />
                                        <span>Document (Word / PDF / PPT)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormMaterialType("VIDEO")}
                                        className={`p-3 rounded-xl border text-center font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                            formMaterialType === "VIDEO"
                                                ? "border-[#4085b3] bg-blue-50/60 text-[#4085b3]"
                                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                        }`}
                                    >
                                        <Video className="w-4 h-4" />
                                        <span>Video Tutorial</span>
                                    </button>
                                </div>
                            </div>

                            {/* Assigned Class Target */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Target Class & Subject
                                </label>
                                <select
                                    value={formClassId}
                                    onChange={e => setFormClassId(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#4085b3]"
                                >
                                    {classes.map((cls: any) => {
                                        const id = cls.assignment?.id || cls.id;
                                        const grade = cls.assignment?.schoolGrade?.grade?.level ? `Grade ${cls.assignment.schoolGrade.grade.level}` : (cls.gradeLevel || "");
                                        const section = cls.assignment?.section?.name || cls.section?.name || "";
                                        const subject = cls.assignment?.subject?.name || cls.subject?.name || "";
                                        return (
                                            <option key={id} value={id}>
                                                {grade} {section ? `- Section ${section}` : ""} ({subject})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Title & Unit */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                        Material Title *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Chapter 4 Motion & Energy"
                                        value={formTitle}
                                        onChange={e => setFormTitle(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium outline-none focus:bg-white focus:ring-1 focus:ring-[#4085b3]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                        Unit / Topic (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Unit 4: Dynamics"
                                        value={formUnitName}
                                        onChange={e => setFormUnitName(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium outline-none focus:bg-white focus:ring-1 focus:ring-[#4085b3]"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    Instructions or Notes for Students
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Brief overview or instructions for studying this material..."
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium outline-none focus:bg-white focus:ring-1 focus:ring-[#4085b3]"
                                />
                            </div>

                            {/* File Upload Zone */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                    {formMaterialType === "DOCUMENT" ? "Attach Document File *" : "Upload Video or Enter URL"}
                                </label>
                                <div className="p-4 border-2 border-dashed border-slate-300 hover:border-[#4085b3] rounded-xl bg-slate-50 text-center transition-colors">
                                    <input
                                        type="file"
                                        id="material-file-input"
                                        onChange={handleFileChange}
                                        accept={formMaterialType === "DOCUMENT" ? ".pdf,.doc,.docx,.ppt,.pptx" : "video/*,.mp4,.webm"}
                                        className="hidden"
                                    />
                                    <label htmlFor="material-file-input" className="cursor-pointer block">
                                        <Upload className="w-6 h-6 text-[#4085b3] mx-auto mb-1.5" />
                                        {selectedFile ? (
                                            <div>
                                                <p className="font-bold text-slate-900">{selectedFile.name}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">{formatBytes(selectedFile.size)}</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="font-bold text-slate-800">
                                                    Click to browse {formMaterialType === "DOCUMENT" ? "Word, PDF, or PowerPoint" : "video file"}
                                                </p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">
                                                    {formMaterialType === "DOCUMENT" ? "Supported: .pdf, .docx, .doc, .pptx, .ppt" : "Supported: .mp4, .webm"}
                                                </p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* Video URL Alternative for Video Tutorials */}
                            {formMaterialType === "VIDEO" && (
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                                        Or Video Tutorial Link (YouTube, Vimeo, or Video Stream)
                                    </label>
                                    <input
                                        type="url"
                                        placeholder="https://www.youtube.com/watch?v=..."
                                        value={formVideoUrl}
                                        onChange={e => setFormVideoUrl(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium outline-none focus:bg-white focus:ring-1 focus:ring-[#4085b3]"
                                    />
                                </div>
                            )}

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setIsUploadModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-semibold hover:bg-slate-100 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {submitting ? "Posting..." : "Post Learning Material"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
