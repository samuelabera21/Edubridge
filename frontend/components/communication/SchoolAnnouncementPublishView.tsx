"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import {
    ArrowLeft,
    Send,
    Megaphone,
    UploadCloud,
    Paperclip,
    Image as ImageIcon,
    FileText,
    X,
    Check,
    CheckCircle2,
    AlertCircle,
    Calendar,
    Users,
    GraduationCap,
    School,
    BookOpen,
    UserCheck,
    Loader2
} from "lucide-react";

export interface RecipientGradeSection {
    id: string;
    name: string;
    fullName: string;
    studentsCount: number;
}

export interface RecipientGrade {
    id: string;
    gradeId: string;
    name: string;
    level: number;
    totalStudents: number;
    sections: RecipientGradeSection[];
}

export interface RecipientTeacher {
    id: string;
    userId: string;
    name: string;
    email: string;
    subjects: string[];
    gradeIds: string[];
    sectionIds: string[];
}

export interface RecipientStudent {
    id: string;
    userId?: string;
    name: string;
    email: string;
    studentIdNumber: string;
    sectionId: string;
    sectionName: string;
    gradeId: string;
    gradeName: string;
}

export interface RecipientHierarchy {
    academicYear: { id: string; name: string } | null;
    totalGrades: number;
    totalTeachers: number;
    totalStudents: number;
    grades: RecipientGrade[];
    teachers: RecipientTeacher[];
    students: RecipientStudent[];
}

interface SchoolAnnouncementPublishViewProps {
    onBack?: () => void;
    onPublished?: () => void;
}

export default function SchoolAnnouncementPublishView({ onBack, onPublished }: SchoolAnnouncementPublishViewProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form fields
    const [title, setTitle] = useState("");
    const [targetType, setTargetType] = useState<
        "ALL" | "TEACHERS" | "STUDENTS" | "PARENTS" | "SPECIFIC_GRADE" | "SPECIFIC_SECTION" | "SPECIFIC_TEACHER" | "SPECIFIC_STUDENT"
    >("ALL");

    // Drill-down filter states
    const [selectedGradeId, setSelectedGradeId] = useState("");
    const [selectedSectionId, setSelectedSectionId] = useState("");
    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [selectedStudentId, setSelectedStudentId] = useState("");

    // Dates
    const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState("");

    // Content
    const [content, setContent] = useState("");

    // Attachment (Image or PDF via MinIO)
    const [attachmentUrl, setAttachmentUrl] = useState("");
    const [attachmentName, setAttachmentName] = useState("");
    const [uploadingFile, setUploadingFile] = useState(false);
    const [isAcknowledgmentRequired, setIsAcknowledgmentRequired] = useState(true);

    // Hierarchy data
    const [hierarchy, setHierarchy] = useState<RecipientHierarchy | null>(null);
    const [loadingHierarchy, setLoadingHierarchy] = useState(true);

    // Submission & Confirmation
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successReceipt, setSuccessReceipt] = useState<{
        title: string;
        recipientsCount: number;
        notificationsCount: number;
    } | null>(null);

    // Load hierarchy from backend
    useEffect(() => {
        async function loadHierarchy() {
            setLoadingHierarchy(true);
            try {
                const res = await fetchApi("/communication/announcements/recipients-tree");
                if (res.ok) {
                    const payload = await res.json();
                    const hierarchyData = payload.data || (payload.grades ? payload : null);
                    if (hierarchyData) {
                        setHierarchy(hierarchyData);
                    }
                }
            } catch (err: any) {
                console.error("Error loading recipient tree:", err);
            } finally {
                setLoadingHierarchy(false);
            }
        }
        loadHierarchy();
    }, []);

    // Filter available sections based on selected Grade
    const availableSections = useMemo(() => {
        if (!hierarchy?.grades || !selectedGradeId) return [];
        const grade = hierarchy.grades.find(g => g.id === selectedGradeId);
        return grade?.sections || [];
    }, [hierarchy, selectedGradeId]);

    // Filter available teachers based on selected Grade / Section (if chosen)
    const availableTeachers = useMemo(() => {
        if (!hierarchy?.teachers) return [];
        let list = hierarchy.teachers;
        if (selectedGradeId) {
            list = list.filter(t => t.gradeIds.length === 0 || t.gradeIds.includes(selectedGradeId));
        }
        if (selectedSectionId) {
            list = list.filter(t => t.sectionIds.length === 0 || t.sectionIds.includes(selectedSectionId));
        }
        return list;
    }, [hierarchy, selectedGradeId, selectedSectionId]);

    // Filter available students based on selected Grade / Section
    const availableStudents = useMemo(() => {
        if (!hierarchy?.students) return [];
        let list = hierarchy.students;
        if (selectedGradeId) {
            list = list.filter(s => s.gradeId === selectedGradeId);
        }
        if (selectedSectionId) {
            list = list.filter(s => s.sectionId === selectedSectionId);
        }
        return list;
    }, [hierarchy, selectedGradeId, selectedSectionId]);

    // MinIO File Upload Handler (Supports PDF, JPG, PNG)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);
        setUploadingFile(true);

        try {
            // 1. Request presigned upload URL from storage service
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

            // 2. Upload file directly to MinIO
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

        // Validate drill-down selection
        if (targetType === "SPECIFIC_GRADE" && !selectedGradeId) {
            setError("Please select a target Grade.");
            return;
        }
        if (targetType === "SPECIFIC_SECTION" && !selectedSectionId) {
            setError("Please select a target Section.");
            return;
        }
        if (targetType === "SPECIFIC_TEACHER" && !selectedTeacherId) {
            setError("Please select a target Teacher.");
            return;
        }
        if (targetType === "SPECIFIC_STUDENT" && !selectedStudentId) {
            setError("Please select a target Student.");
            return;
        }

        try {
            setSubmitting(true);

            // Construct payload matching backend target enum and details
            let primaryTarget: "ALL" | "TEACHERS" | "STUDENTS" | "PARENTS" | "SPECIFIC_GRADE" | "SPECIFIC_SECTION" = "ALL";
            let primaryTargetId: string | null = null;
            const targetDetails: any = {
                targetRoles: [],
                gradeIds: [],
                sectionIds: [],
                teacherIds: [],
                studentIds: [],
                targetLabels: []
            };

            if (targetType === "ALL") {
                primaryTarget = "ALL";
                targetDetails.targetRoles = ["ALL"];
                targetDetails.targetLabels = ["Entire School Community"];
            } else if (targetType === "TEACHERS") {
                primaryTarget = "TEACHERS";
                targetDetails.targetRoles = ["TEACHERS"];
                targetDetails.targetLabels = ["All Teachers"];
            } else if (targetType === "STUDENTS") {
                primaryTarget = "STUDENTS";
                targetDetails.targetRoles = ["STUDENTS"];
                targetDetails.targetLabels = ["All Students"];
            } else if (targetType === "PARENTS") {
                primaryTarget = "PARENTS";
                targetDetails.targetRoles = ["PARENTS"];
                targetDetails.targetLabels = ["All Parents"];
            } else if (targetType === "SPECIFIC_GRADE") {
                primaryTarget = "SPECIFIC_GRADE";
                primaryTargetId = selectedGradeId;
                targetDetails.gradeIds = [selectedGradeId];
                const g = hierarchy?.grades.find(item => item.id === selectedGradeId);
                targetDetails.targetLabels = [g?.name || "Target Grade"];
            } else if (targetType === "SPECIFIC_SECTION") {
                primaryTarget = "SPECIFIC_SECTION";
                primaryTargetId = selectedSectionId;
                targetDetails.sectionIds = [selectedSectionId];
                let secName = "Target Section";
                for (const g of hierarchy?.grades || []) {
                    const sec = g.sections.find(s => s.id === selectedSectionId);
                    if (sec) {
                        secName = sec.fullName || `${g.name} - ${sec.name}`;
                        break;
                    }
                }
                targetDetails.targetLabels = [secName];
            } else if (targetType === "SPECIFIC_TEACHER") {
                primaryTarget = "ALL";
                targetDetails.teacherIds = [selectedTeacherId];
                const t = hierarchy?.teachers.find(item => item.id === selectedTeacherId);
                targetDetails.targetLabels = [`Teacher: ${t?.name || "Teacher"}`];
            } else if (targetType === "SPECIFIC_STUDENT") {
                primaryTarget = "ALL";
                targetDetails.studentIds = [selectedStudentId];
                const st = hierarchy?.students.find(item => item.id === selectedStudentId);
                targetDetails.targetLabels = [`Student: ${st?.name || "Student"} (${st?.studentIdNumber || ""})`];
            }

            const payload = {
                title: title.trim(),
                content: content.trim(),
                target: primaryTarget,
                targetId: primaryTargetId,
                targetDetails,
                attachmentUrl: attachmentUrl.trim() || undefined,
                attachmentName: attachmentName.trim() || undefined,
                isAcknowledgmentRequired,
                expiresAt: endDate ? new Date(endDate).toISOString() : undefined
            };

            const res = await fetchApi("/communication/announcements", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                setSuccessReceipt({
                    title: title.trim(),
                    recipientsCount: data.recipientsCount || 0,
                    notificationsCount: data.notificationsCount || 0
                });
            } else {
                const errData = await res.json().catch(() => ({}));
                setError(errData.error || "Failed to publish announcement.");
            }
        } catch (err: any) {
            console.error("Error publishing announcement:", err);
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
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-slate-900">Publish Announcement</h1>
                        <p className="text-xs text-slate-500">Send an official announcement to school members.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => (onBack ? onBack() : router.back())}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
                    <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Main Clean Form Card */}
            <form onSubmit={handlePublish} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                {/* 1. Target Audience Filter (Single Place) */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                        Target Audience <span className="text-rose-500">*</span>
                    </label>
                    <select
                        value={targetType}
                        onChange={(e) => {
                            const val = e.target.value as any;
                            setTargetType(val);
                            setSelectedGradeId("");
                            setSelectedSectionId("");
                            setSelectedTeacherId("");
                            setSelectedStudentId("");
                        }}
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-blue-600 font-medium text-slate-800"
                    >
                        <option value="ALL">Entire School (All Community)</option>
                        <option value="TEACHERS">All Teachers</option>
                        <option value="STUDENTS">All Students</option>
                        <option value="PARENTS">All Parents</option>
                        <option value="SPECIFIC_GRADE">Target Specific Grade</option>
                        <option value="SPECIFIC_SECTION">Target Specific Class Section</option>
                        <option value="SPECIFIC_TEACHER">Target Specific Teacher</option>
                        <option value="SPECIFIC_STUDENT">Target Specific Student</option>
                    </select>

                    {/* Drill-down: Specific Grade */}
                    {targetType === "SPECIFIC_GRADE" && (
                        <div className="pt-2">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Grade *</label>
                            <select
                                value={selectedGradeId}
                                onChange={(e) => setSelectedGradeId(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-600"
                            >
                                <option value="">-- Choose Grade --</option>
                                {hierarchy?.grades.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.name} ({g.totalStudents} students)
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Drill-down: Specific Class Section */}
                    {targetType === "SPECIFIC_SECTION" && (
                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">1. Select Grade *</label>
                                <select
                                    value={selectedGradeId}
                                    onChange={(e) => {
                                        setSelectedGradeId(e.target.value);
                                        setSelectedSectionId("");
                                    }}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-600"
                                >
                                    <option value="">-- Choose Grade --</option>
                                    {hierarchy?.grades.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">2. Select Section *</label>
                                <select
                                    value={selectedSectionId}
                                    disabled={!selectedGradeId}
                                    onChange={(e) => setSelectedSectionId(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100"
                                >
                                    <option value="">-- Choose Section --</option>
                                    {availableSections.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            Section {s.name} ({s.studentsCount} students)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Drill-down: Specific Teacher */}
                    {targetType === "SPECIFIC_TEACHER" && (
                        <div className="pt-2 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Filter by Grade (Optional)</label>
                                    <select
                                        value={selectedGradeId}
                                        onChange={(e) => {
                                            setSelectedGradeId(e.target.value);
                                            setSelectedSectionId("");
                                            setSelectedTeacherId("");
                                        }}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-600"
                                    >
                                        <option value="">-- All Grades --</option>
                                        {hierarchy?.grades.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Filter by Section (Optional)</label>
                                    <select
                                        value={selectedSectionId}
                                        disabled={!selectedGradeId}
                                        onChange={(e) => {
                                            setSelectedSectionId(e.target.value);
                                            setSelectedTeacherId("");
                                        }}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100"
                                    >
                                        <option value="">-- All Sections --</option>
                                        {availableSections.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                Section {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Teacher *</label>
                                <select
                                    value={selectedTeacherId}
                                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-600 font-medium"
                                >
                                    <option value="">-- Select Teacher from List --</option>
                                    {availableTeachers.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} {t.subjects.length > 0 ? `(${t.subjects.join(", ")})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Drill-down: Specific Student */}
                    {targetType === "SPECIFIC_STUDENT" && (
                        <div className="pt-2 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Filter by Grade (Optional)</label>
                                    <select
                                        value={selectedGradeId}
                                        onChange={(e) => {
                                            setSelectedGradeId(e.target.value);
                                            setSelectedSectionId("");
                                            setSelectedStudentId("");
                                        }}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-600"
                                    >
                                        <option value="">-- All Grades --</option>
                                        {hierarchy?.grades.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.name} ({g.totalStudents} students)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Filter by Section (Optional)</label>
                                    <select
                                        value={selectedSectionId}
                                        disabled={!selectedGradeId}
                                        onChange={(e) => {
                                            setSelectedSectionId(e.target.value);
                                            setSelectedStudentId("");
                                        }}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100"
                                    >
                                        <option value="">-- All Sections in Grade --</option>
                                        {availableSections.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                Section {s.name} ({s.studentsCount} students)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student *</label>
                                <select
                                    value={selectedStudentId}
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-blue-600 font-medium"
                                >
                                    <option value="">-- Select Student from List --</option>
                                    {availableStudents.map((st) => (
                                        <option key={st.id} value={st.id}>
                                            {st.name} {st.studentIdNumber ? `(${st.studentIdNumber})` : ""} {st.sectionName ? `[${st.sectionName}]` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
                        placeholder="e.g., End of Term Exam Schedule"
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
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
                    
                    {/* Hidden file input */}
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
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
                                className="text-slate-400 hover:text-rose-600 p-1"
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
                        placeholder="Write the full announcement message and instructions here..."
                        className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    />
                </div>

                {/* 6. Acknowledgment & Status Confirmation Toggle */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-blue-100 bg-blue-50/50">
                    <input
                        type="checkbox"
                        id="requireAckToggle"
                        checked={isAcknowledgmentRequired}
                        onChange={(e) => setIsAcknowledgmentRequired(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="requireAckToggle" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                        Track Delivery & Require Recipient Confirmation
                        <span className="block text-2xs font-normal text-slate-500 mt-0.5">
                            Recipients receive an interactive &quot;Confirm Receipt&quot; prompt, and live delivery status (Seen / Read / Confirmed) will appear on your announcement ledger.
                        </span>
                    </label>
                </div>

                {/* 7. Footer Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={() => (onBack ? onBack() : router.back())}
                        className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || uploadingFile}
                        className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-xs"
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
                                &quot;{successReceipt.title}&quot; has been published successfully.
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
                                    setSelectedGradeId("");
                                    setSelectedSectionId("");
                                    setSelectedTeacherId("");
                                    setSelectedStudentId("");
                                }}
                                className="flex-1 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                            >
                                Send Another
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSuccessReceipt(null);
                                    if (onPublished) onPublished();
                                    else if (onBack) onBack();
                                    else router.push("/dashboard/communication/announcements");
                                }}
                                className="flex-1 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                            >
                                View All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
