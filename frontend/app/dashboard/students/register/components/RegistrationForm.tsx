"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
    User, 
    UserPlus, 
    Search, 
    FileText, 
    Users, 
    Calendar, 
    BookOpen, 
    CheckCircle2, 
    AlertCircle, 
    ArrowRight, 
    ArrowLeft,
    Info, 
    RefreshCw, 
    ShieldCheck, 
    Check,
    Phone,
    Home,
    FileCheck,
    UploadCloud,
    X,
    Paperclip,
    Eye,
    Loader2,
    Printer,
    Copy,
    Key,
    Sparkles,
    Lock,
    ExternalLink
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { fetchApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { AcademicYear } from "@/types/api";

// ─── Document Upload State ────────────────────────────────────────────────────
type UploadStatus = "idle" | "uploading" | "done" | "error";
interface UploadState {
    status: UploadStatus;
    progress: number;        // 0–100
    fileName: string;
    fileSize: number;
    publicUrl: string;
    error: string | null;
}

const defaultUpload = (): UploadState => ({
    status: "idle",
    progress: 0,
    fileName: "",
    fileSize: 0,
    publicUrl: "",
    error: null,
});

// ─── DocumentUploader Component ──────────────────────────────────────────────
interface DocumentUploaderProps {
    label: string;
    badge?: string;
    badgeColor?: string;
    description: string;
    accept?: string;
    state: UploadState;
    onChange: (state: UploadState) => void;
}

function DocumentUploader({
    label, badge, badgeColor = "amber", description, accept = "application/pdf,image/jpeg,image/png",
    state, onChange
}: DocumentUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    // Keep a ref so XHR progress callbacks can read latest state without stale closure
    const stateRef = useRef<UploadState>(state);
    stateRef.current = state;

    const handleFile = useCallback(async (file: File) => {
        // Validate size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            onChange({ ...defaultUpload(), status: "error", error: "File too large. Maximum size is 10MB." });
            return;
        }

        // Validate type
        const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
        if (!allowed.includes(file.type)) {
            onChange({ ...defaultUpload(), status: "error", error: "Only PDF, JPEG, and PNG files are accepted." });
            return;
        }

        onChange({ ...defaultUpload(), status: "uploading", progress: 10, fileName: file.name, fileSize: file.size, publicUrl: "", error: null });

        try {
            // Step 1: Get presigned URL from backend
            const presignRes = await fetchApi("/storage/presign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName: file.name, contentType: file.type, folder: "students/documents" }),
            });
            if (!presignRes.ok) {
                const err = await presignRes.json().catch(() => ({}));
                throw new Error(err.error || "Failed to get upload URL");
            }
            const { presignedUrl, publicUrl } = await presignRes.json();

            onChange({ ...stateRef.current, progress: 30 });

            // Step 2: PUT file directly to MinIO using presigned URL
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("PUT", presignedUrl, true);
                xhr.setRequestHeader("Content-Type", file.type);
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const pct = 30 + Math.round((e.loaded / e.total) * 65);
                        onChange({ ...stateRef.current, progress: pct });
                    }
                };
                xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: HTTP ${xhr.status}`));
                xhr.onerror = () => reject(new Error("Network error during upload."));
                xhr.send(file);
            });

            // Step 3: Done
            onChange({ status: "done", progress: 100, fileName: file.name, fileSize: file.size, publicUrl, error: null });
        } catch (err: any) {
            onChange({ ...defaultUpload(), status: "error", fileName: file.name, fileSize: file.size, publicUrl: "", error: err.message || "Upload failed." });
        }
    }, [onChange]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const badgeColors: Record<string, string> = {
        amber: "bg-amber-50 text-amber-700 border-amber-200",
        blue: "bg-blue-50 text-blue-700 border-blue-200",
        gray: "bg-gray-100 text-gray-600 border-gray-200",
    };

    const isPdf = state.fileName.toLowerCase().endsWith(".pdf");
    const isImage = [".jpg", ".jpeg", ".png"].some(ext => state.fileName.toLowerCase().endsWith(ext));

    return (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden transition-shadow hover:shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#4085b3]/10 flex items-center justify-center flex-shrink-0">
                        <Paperclip className="w-3.5 h-3.5 text-[#4085b3]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-gray-900">{label}</span>
                            {badge && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badgeColors[badgeColor] || badgeColors.gray}`}>
                                    {badge}
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>
                    </div>
                </div>
                {state.status === "done" && (
                    <button
                        type="button"
                        onClick={() => onChange(defaultUpload())}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded flex-shrink-0"
                        title="Remove file"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Upload Zone */}
            <div className="p-4">
                {state.status === "idle" || state.status === "error" ? (
                    <>
                        <div
                            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                                dragging
                                    ? "border-[#4085b3] bg-[#4085b3]/5"
                                    : state.status === "error"
                                    ? "border-red-300 bg-red-50/50"
                                    : "border-gray-200 bg-gray-50/50 hover:border-[#4085b3]/40 hover:bg-[#4085b3]/5"
                            }`}
                            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={accept}
                                className="hidden"
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                            />
                            <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${ dragging ? "text-[#4085b3]" : "text-gray-400" }`} />
                            <p className="text-[13px] font-medium text-gray-700">
                                {dragging ? "Drop file here" : "Click to browse or drag & drop"}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">PDF, JPEG, PNG — max 10 MB</p>
                        </div>
                        {state.status === "error" && state.error && (
                            <div className="flex items-center gap-2 mt-2.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                {state.error}
                            </div>
                        )}
                    </>
                ) : state.status === "uploading" ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#4085b3]/10 flex items-center justify-center flex-shrink-0">
                                <Loader2 className="w-4 h-4 text-[#4085b3] animate-spin" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-gray-800 truncate">{state.fileName}</p>
                                <p className="text-[11px] text-gray-400">{formatBytes(state.fileSize)} · Uploading...</p>
                            </div>
                            <span className="text-xs font-bold text-[#4085b3]">{state.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#4085b3] rounded-full transition-all duration-300"
                                style={{ width: `${state.progress}%` }}
                            />
                        </div>
                    </div>
                ) : ( // done
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${ isPdf ? "bg-red-50" : "bg-blue-50" }`}>
                            {isPdf ? (
                                <FileText className="w-4 h-4 text-red-500" />
                            ) : (
                                <Eye className="w-4 h-4 text-blue-500" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-gray-800 truncate">{state.fileName}</p>
                            <p className="text-[11px] text-gray-400">{formatBytes(state.fileSize)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={state.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-medium text-[#4085b3] hover:underline flex items-center gap-1"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                Preview
                            </a>
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Uploaded
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

type WizardStep = "TYPE" | "IDENTITY" | "GUARDIAN" | "ENROLLMENT" | "DOCUMENTS" | "REVIEW";

const STEPS: { id: WizardStep; label: string; number: number }[] = [
    { id: "TYPE", label: "Registration Type", number: 1 },
    { id: "IDENTITY", label: "Student Identity", number: 2 },
    { id: "GUARDIAN", label: "Parent / Guardian", number: 3 },
    { id: "ENROLLMENT", label: "Academic Cohort", number: 4 },
    { id: "DOCUMENTS", label: "Supporting Evidence", number: 5 },
    { id: "REVIEW", label: "Review & Submit", number: 6 },
];

export function RegistrationForm() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<WizardStep>("TYPE");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [successResult, setSuccessResult] = useState<any | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Document Upload States
    const [uploadBirthCert, setUploadBirthCert] = useState<UploadState>(defaultUpload());
    const [uploadGuardianId, setUploadGuardianId] = useState<UploadState>(defaultUpload());
    const [uploadTranscript, setUploadTranscript] = useState<UploadState>(defaultUpload());
    const [uploadTransferCert, setUploadTransferCert] = useState<UploadState>(defaultUpload());

    // Academic Data
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);
    const [loadingGrades, setLoadingGrades] = useState(false);

    // Intake Mode
    const [intakeMode, setIntakeMode] = useState<"NEW" | "RETURNING">("NEW");

    // Returning Student Search
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        // 1. Student Identity (Ethiopian 3-Tier Name)
        firstName: "",
        fatherName: "",
        grandfatherName: "",
        dateOfBirth: "",
        gender: "MALE",
        nationality: "Ethiopian",
        placeOfBirth: "",
        nationalId: "",
        
        // Address
        region: "Addis Ababa",
        zone: "",
        woreda: "",
        city: "Addis Ababa",
        kebele: "",
        houseNumber: "",

        // 2. Parent / Guardian
        guardianName: "",
        guardianRelationship: "Mother",
        guardianPhone: "",
        guardianAltPhone: "",
        guardianEmail: "",
        guardianCanPickup: true,
        guardianIsPrimary: true,

        // Emergency Contact
        emergencyContactName: "",
        emergencyContactRelation: "",
        emergencyContactPhone: "",

        // 3. Academic Intake & Enrollment
        academicYearId: "",
        schoolGradeId: "",
        enrollmentType: "NEW", // NEW, RETURNING, TRANSFER_IN, RE_ENTRY
        enrollmentDate: new Date().toISOString().split("T")[0],
        
        // Transfer / Previous School Info
        previousSchool: "",
        previousStudentId: "",

        // 4. Supporting Documents
        birthCertTitle: "Birth Certificate",
        birthCertUrl: "",
        guardianIdTitle: "Kebele / National ID Card",
        guardianIdUrl: "",
        transcriptTitle: "Previous School Official Transcript",
        transcriptUrl: "",
        transferCertTitle: "Transfer Clearance Certificate",
        transferCertUrl: "",
    });

    // Load Initial Academic Years
    useEffect(() => {
        async function loadAcademicSetup() {
            try {
                setLoading(true);
                const yearsRes = await fetchApi("/academic/years");
                if (!yearsRes.ok) throw new Error("Failed to load academic years");
                const yearsData: AcademicYear[] = await yearsRes.json();
                setAcademicYears(yearsData);

                const active = yearsData.find(y => y.status === "ACTIVE") || yearsData[0];
                if (active) {
                    setActiveYear(active);
                    setFormData(prev => ({ ...prev, academicYearId: active.id }));
                    loadGradesForYear(active.id);
                }
            } catch (err: any) {
                setError(err.message || "Failed to initialize academic calendar data");
            } finally {
                setLoading(false);
            }
        }
        loadAcademicSetup();
    }, []);

    // Load Grades when Academic Year changes
    async function loadGradesForYear(yearId: string) {
        if (!yearId) return;
        try {
            setLoadingGrades(true);
            const gradesRes = await fetchApi(`/academic/years/${yearId}/grades`);
            if (gradesRes.ok) {
                const data = await gradesRes.json();
                setSchoolGrades(data);
                if (data.length > 0 && !formData.schoolGradeId) {
                    setFormData(prev => ({ ...prev, schoolGradeId: data[0].id }));
                }
            }
        } catch (e) {
            console.error("Error loading school grades:", e);
        } finally {
            setLoadingGrades(false);
        }
    }

    const handleYearChange = (yearId: string) => {
        const found = academicYears.find(y => y.id === yearId);
        setActiveYear(found || null);
        setFormData(prev => ({ ...prev, academicYearId: yearId, schoolGradeId: "" }));
        loadGradesForYear(yearId);
    };

    // Live Search for Returning Students
    const handleSearchStudents = async () => {
        if (!searchQuery.trim()) return;
        try {
            setSearching(true);
            setError(null);
            const res = await fetchApi(`/student/search?query=${encodeURIComponent(searchQuery.trim())}`);
            if (!res.ok) throw new Error("Failed to search student registry");
            const data = await res.json();
            setSearchResults(data);
            if (data.length === 0) {
                setError("No existing student identity found matching your search query.");
            }
        } catch (err: any) {
            setError(err.message || "Search error");
        } finally {
            setSearching(false);
        }
    };

    const handleSelectReturningStudent = (stu: any) => {
        setSelectedStudent(stu);
        setFormData(prev => ({
            ...prev,
            firstName: stu.firstName || "",
            fatherName: stu.fatherName || "",
            grandfatherName: stu.grandfatherName || "",
            dateOfBirth: stu.dateOfBirth ? new Date(stu.dateOfBirth).toISOString().split("T")[0] : "",
            gender: stu.gender || "MALE",
            nationality: stu.nationality || "Ethiopian",
            placeOfBirth: stu.placeOfBirth || "",
            nationalId: stu.nationalId || "",
            region: stu.region || "Addis Ababa",
            zone: stu.zone || "",
            woreda: stu.woreda || "",
            city: stu.city || "Addis Ababa",
            kebele: stu.kebele || "",
            houseNumber: stu.houseNumber || "",
            enrollmentType: "RETURNING",
            // Prefill guardian if exists
            guardianName: stu.guardians?.[0]?.parent?.user?.name || stu.guardians?.[0]?.parent?.emergencyPhone || "",
            guardianPhone: stu.guardians?.[0]?.parent?.emergencyPhone || "",
            guardianRelationship: stu.guardians?.[0]?.relationship || "Parent",
        }));
        setCurrentStep("ENROLLMENT");
    };

    const handleNext = () => {
        setError(null);
        if (currentStep === "TYPE") {
            if (intakeMode === "RETURNING" && !selectedStudent) {
                setError("Please search and select a returning student record to continue.");
                return;
            }
            setCurrentStep(intakeMode === "RETURNING" ? "ENROLLMENT" : "IDENTITY");
            return;
        }

        if (currentStep === "IDENTITY") {
            if (!formData.firstName.trim() || !formData.fatherName.trim() || !formData.grandfatherName.trim()) {
                setError("Ethiopian 3-tier naming (First, Father, Grandfather name) is mandatory.");
                return;
            }
            setCurrentStep("GUARDIAN");
            return;
        }

        if (currentStep === "GUARDIAN") {
            if (!formData.guardianName.trim() || !formData.guardianPhone.trim()) {
                setError("Primary Parent / Guardian name and contact phone are required.");
                return;
            }
            setCurrentStep("ENROLLMENT");
            return;
        }

        if (currentStep === "ENROLLMENT") {
            if (!formData.academicYearId) {
                setError("Please select a target Academic Year.");
                return;
            }
            if (!formData.schoolGradeId) {
                setError("Please select a target Grade Cohort.");
                return;
            }
            setCurrentStep("DOCUMENTS");
            return;
        }

        if (currentStep === "DOCUMENTS") {
            setCurrentStep("REVIEW");
            return;
        }
    };

    const handleBack = () => {
        setError(null);
        if (currentStep === "IDENTITY") setCurrentStep("TYPE");
        else if (currentStep === "GUARDIAN") setCurrentStep("IDENTITY");
        else if (currentStep === "ENROLLMENT") setCurrentStep(intakeMode === "RETURNING" ? "TYPE" : "GUARDIAN");
        else if (currentStep === "DOCUMENTS") setCurrentStep("ENROLLMENT");
        else if (currentStep === "REVIEW") setCurrentStep("DOCUMENTS");
    };

    const handleSubmitRegistration = async () => {
        try {
            setSubmitting(true);
            setError(null);

            // Build Documents Array from upload states
            const docList = [];
            if (uploadBirthCert.publicUrl) {
                docList.push({
                    documentType: "BIRTH_CERTIFICATE",
                    title: "Birth Certificate",
                    fileUrl: uploadBirthCert.publicUrl
                });
            }
            if (uploadGuardianId.publicUrl) {
                docList.push({
                    documentType: "GUARDIAN_ID",
                    title: "Kebele / National ID Card",
                    fileUrl: uploadGuardianId.publicUrl
                });
            }
            if (uploadTranscript.publicUrl) {
                docList.push({
                    documentType: "PREVIOUS_TRANSCRIPT",
                    title: "Previous School Official Transcript",
                    fileUrl: uploadTranscript.publicUrl
                });
            }
            if (uploadTransferCert.publicUrl) {
                docList.push({
                    documentType: "TRANSFER_CERTIFICATE",
                    title: "Transfer Clearance Certificate",
                    fileUrl: uploadTransferCert.publicUrl
                });
            }

            // Build Guardians Array
            const guardianList = [];
            if (formData.guardianName && formData.guardianName.trim()) {
                const nameParts = formData.guardianName.trim().split(/\s+/);
                const gFirstName = nameParts[0] || "Guardian";
                const gLastName = nameParts.slice(1).join(" ") || gFirstName;
                guardianList.push({
                    fullName: formData.guardianName.trim(),
                    firstName: gFirstName,
                    lastName: gLastName,
                    relationship: formData.guardianRelationship || "Guardian",
                    phone: formData.guardianPhone || undefined,
                    phoneNumber: formData.guardianPhone || undefined,
                    altPhone: formData.guardianAltPhone || undefined,
                    email: formData.guardianEmail || undefined,
                    isPrimary: formData.guardianIsPrimary !== undefined ? formData.guardianIsPrimary : true,
                    canPickup: formData.guardianCanPickup !== undefined ? formData.guardianCanPickup : true
                });
            }

            const payload: any = {
                isExistingStudent: intakeMode === "RETURNING",
                existingStudentId: selectedStudent?.id,
                student: {
                    firstName: formData.firstName.trim(),
                    fatherName: formData.fatherName.trim(),
                    grandfatherName: formData.grandfatherName.trim(),
                    dateOfBirth: formData.dateOfBirth || undefined,
                    gender: formData.gender,
                    nationality: formData.nationality,
                    placeOfBirth: formData.placeOfBirth || undefined,
                    region: formData.region,
                    zone: formData.zone || undefined,
                    woreda: formData.woreda || undefined,
                    city: formData.city || undefined,
                    kebele: formData.kebele || undefined,
                    houseNumber: formData.houseNumber || undefined,
                    previousSchool: formData.previousSchool || undefined,
                    previousStudentId: formData.previousStudentId || undefined,
                    emergencyContactName: formData.emergencyContactName || undefined,
                    emergencyContactRelation: formData.emergencyContactRelation || undefined,
                    emergencyContactPhone: formData.emergencyContactPhone || undefined,
                },
                guardians: guardianList,
                enrollment: {
                    academicYearId: formData.academicYearId,
                    schoolGradeId: formData.schoolGradeId,
                    enrollmentType: formData.enrollmentType,
                    enrollmentDate: formData.enrollmentDate
                },
                documents: docList
            };

            const res = await fetchApi("/student/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || "Failed to register student");
            }

            const resData = await res.json();
            setSuccessResult(resData);
            setSuccessMessage(
                `Student ${resData.student?.firstName} ${resData.student?.fatherName} successfully registered! ID: ${resData.student?.studentId}`
            );
        } catch (err: any) {
            setError(err.message || "An error occurred during student registration");
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetForm = () => {
        setSuccessResult(null);
        setSuccessMessage(null);
        setError(null);
        setCurrentStep("TYPE");
        setIntakeMode("NEW");
        setSelectedStudent(null);
        setSearchQuery("");
        setSearchResults([]);
        setUploadBirthCert(defaultUpload());
        setUploadGuardianId(defaultUpload());
        setUploadTranscript(defaultUpload());
        setUploadTransferCert(defaultUpload());
        setFormData({
            firstName: "",
            fatherName: "",
            grandfatherName: "",
            dateOfBirth: "",
            gender: "MALE",
            nationality: "Ethiopian",
            placeOfBirth: "",
            nationalId: "",
            region: "Addis Ababa",
            zone: "",
            woreda: "",
            city: "Addis Ababa",
            kebele: "",
            houseNumber: "",
            guardianName: "",
            guardianRelationship: "Mother",
            guardianPhone: "",
            guardianAltPhone: "",
            guardianEmail: "",
            guardianCanPickup: true,
            guardianIsPrimary: true,
            emergencyContactName: "",
            emergencyContactRelation: "",
            emergencyContactPhone: "",
            academicYearId: activeYear?.id || "",
            schoolGradeId: schoolGrades[0]?.id || "",
            enrollmentType: "NEW",
            enrollmentDate: new Date().toISOString().split("T")[0],
            previousSchool: "",
            previousStudentId: "",
            birthCertTitle: "Birth Certificate",
            birthCertUrl: "",
            guardianIdTitle: "Kebele / National ID Card",
            guardianIdUrl: "",
            transcriptTitle: "Previous School Official Transcript",
            transcriptUrl: "",
            transferCertTitle: "Transfer Clearance Certificate",
            transferCertUrl: "",
        });
    };

    const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

    return (
        <div className="space-y-6">
            {/* EAES / Mesob Style Institutional Progress Stepper */}
            <div className="bg-white border border-gray-200 rounded-lg p-3.5 shadow-sm">
                <div className="flex items-center justify-between gap-1 sm:gap-2">
                    {STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        return (
                            <React.Fragment key={step.id}>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs font-bold transition-all ${
                                        isCompleted 
                                            ? "bg-[#4085b3] text-white" 
                                            : isCurrent 
                                                ? "bg-[#4085b3] text-white ring-2 ring-[#4085b3]/20" 
                                                : "bg-gray-100 text-gray-500 border border-gray-200"
                                    }`}>
                                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.number}
                                    </div>
                                    <span className={`text-[11px] sm:text-xs font-medium hidden md:inline ${
                                        isCurrent ? "text-gray-900 font-bold" : isCompleted ? "text-[#4085b3]" : "text-gray-500"
                                    }`}>
                                        {step.label}
                                    </span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className={`h-0.5 flex-1 min-w-[12px] sm:min-w-[20px] ${idx < currentStepIndex ? "bg-[#4085b3]" : "bg-gray-200"}`} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Error & Success Banners */}
            {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                    <div className="flex-1">
                        <p className="font-semibold">Registration Notice</p>
                        <p className="text-xs mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600" />
                    <div>
                        <p className="font-bold">Official Registration Complete</p>
                        <p className="text-xs mt-0.5">{successMessage}</p>
                    </div>
                </div>
            )}

            {/* STEP 1: REGISTRATION TYPE & IDENTITY LOOKUP */}
            {currentStep === "TYPE" && (
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50/75 border-b border-gray-100 py-3.5 px-5">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#4085b3]" />
                            Select Student Intake Mode
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Option 1: New Student */}
                            <div 
                                onClick={() => { setIntakeMode("NEW"); setSelectedStudent(null); }}
                                className={`cursor-pointer p-5 rounded-lg border-2 transition-all flex flex-col justify-between ${
                                    intakeMode === "NEW" 
                                        ? "border-[#4085b3] bg-[#4085b3]/5 ring-2 ring-[#4085b3]/10" 
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="w-9 h-9 rounded-lg bg-[#4085b3]/10 flex items-center justify-center text-[#4085b3]">
                                            <UserPlus className="w-5 h-5" />
                                        </div>
                                        {intakeMode === "NEW" && (
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#4085b3] text-white">Selected</span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-sm">New Student Registration</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        First-time enrollment into the institution. Generates an official permanent student identity record and admission file.
                                    </p>
                                </div>
                            </div>

                            {/* Option 2: Returning / Re-enrollment */}
                            <div 
                                onClick={() => setIntakeMode("RETURNING")}
                                className={`cursor-pointer p-5 rounded-lg border-2 transition-all flex flex-col justify-between ${
                                    intakeMode === "RETURNING" 
                                        ? "border-[#4085b3] bg-[#4085b3]/5 ring-2 ring-[#4085b3]/10" 
                                        : "border-gray-200 bg-white hover:border-gray-300"
                                }`}
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <RefreshCw className="w-5 h-5" />
                                        </div>
                                        {intakeMode === "RETURNING" && (
                                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#4085b3] text-white">Selected</span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-sm">Returning Student Re-Enrollment</h3>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        Re-enroll an existing student into a new academic year or grade level without duplicating their national/student identity.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Returning Student Search Box */}
                        {intakeMode === "RETURNING" && (
                            <div className="mt-4 p-4 border border-indigo-100 bg-indigo-50/40 rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                        Search Institutional Student Registry
                                    </label>
                                    <span className="text-[11px] text-gray-500">Query by Student ID or Ethiopian 3-tier Name</span>
                                </div>
                                
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSearchStudents()}
                                            placeholder="Enter Student ID (e.g., STU-2609-...) or Student Name..."
                                            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-300 rounded-md focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] outline-none"
                                        />
                                    </div>
                                    <Button 
                                        onClick={handleSearchStudents} 
                                        isLoading={searching}
                                        className="bg-[#4085b3] hover:bg-[#32698e] text-white text-xs px-4"
                                    >
                                        Search Records
                                    </Button>
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="border border-gray-200 rounded-md bg-white divide-y divide-gray-100 max-h-60 overflow-y-auto">
                                        {searchResults.map((stu) => {
                                            const isChosen = selectedStudent?.id === stu.id;
                                            return (
                                                <div 
                                                    key={stu.id} 
                                                    onClick={() => handleSelectReturningStudent(stu)}
                                                    className={`p-3 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                                                        isChosen ? "bg-[#4085b3]/10 font-semibold text-gray-900" : "hover:bg-gray-50 text-gray-700"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center font-bold text-[#4085b3]">
                                                            {stu.firstName?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900">{stu.firstName} {stu.fatherName} {stu.grandfatherName}</p>
                                                            <p className="text-[11px] text-gray-500">ID: {stu.studentId} • Gender: {stu.gender || "N/A"}</p>
                                                        </div>
                                                    </div>
                                                    <Button size="sm" variant={isChosen ? "primary" : "ghost"} className="text-xs h-7">
                                                        {isChosen ? "Selected" : "Select Student"}
                                                    </Button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {selectedStudent && (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            <span>
                                                Selected: <strong>{selectedStudent.firstName} {selectedStudent.fatherName} {selectedStudent.grandfatherName}</strong> ({selectedStudent.studentId})
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedStudent(null)} 
                                            className="text-red-600 hover:underline font-medium"
                                        >
                                            Change
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* STEP 2: STUDENT PERSONAL DETAILS */}
            {currentStep === "IDENTITY" && (
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50/75 border-b border-gray-100 py-3.5 px-5">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <User className="w-4 h-4 text-[#4085b3]" />
                            Student Official Identity & Demographic Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Section A: 3-Tier Ethiopian Names */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4085b3]" />
                                Ethiopian Naming Structure (3-Tier)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    label="First Name / የስም *"
                                    placeholder="e.g. Dawit"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Father's Name / የአባት ስም *"
                                    placeholder="e.g. Kebede"
                                    value={formData.fatherName}
                                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                                    required
                                />
                                <Input
                                    label="Grandfather's Name / የአያት ስም *"
                                    placeholder="e.g. Tadesse"
                                    value={formData.grandfatherName}
                                    onChange={(e) => setFormData({ ...formData, grandfatherName: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {/* Section B: Demographics */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4085b3]" />
                                Vital & Demographic Information
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Select
                                    label="Gender / ጾታ *"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    options={[
                                        { value: "MALE", label: "Male / ወንድ" },
                                        { value: "FEMALE", label: "Female / ሴት" }
                                    ]}
                                    required
                                />
                                <Input
                                    label="Date of Birth / የልደት ቀን"
                                    type="date"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                />
                                <Input
                                    label="Nationality / ዜግነት"
                                    value={formData.nationality}
                                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                                />
                                <Input
                                    label="Place of Birth / የትውልድ ቦታ"
                                    placeholder="e.g. Addis Ababa"
                                    value={formData.placeOfBirth}
                                    onChange={(e) => setFormData({ ...formData, placeOfBirth: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Section C: Residential Address */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4085b3]" />
                                Residential Address & Location Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Select
                                    label="Region / ክልል"
                                    value={formData.region}
                                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                                    options={[
                                        { value: "Addis Ababa", label: "Addis Ababa / አዲስ አበባ" },
                                        { value: "Oromia", label: "Oromia / ኦሮሚያ" },
                                        { value: "Amhara", label: "Amhara / አማራ" },
                                        { value: "Tigray", label: "Tigray / ትግራይ" },
                                        { value: "Sidama", label: "Sidama / ሲዳማ" },
                                        { value: "Somali", label: "Somali / ሶማሌ" },
                                        { value: "Dire Dawa", label: "Dire Dawa / ድሬዳዋ" },
                                        { value: "Other", label: "Other Region" }
                                    ]}
                                />
                                <Input
                                    label="Sub-city / Zone"
                                    placeholder="e.g. Bole / Kirkos"
                                    value={formData.zone}
                                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                />
                                <Input
                                    label="Woreda / ወረዳ"
                                    placeholder="e.g. Woreda 03"
                                    value={formData.woreda}
                                    onChange={(e) => setFormData({ ...formData, woreda: e.target.value })}
                                />
                                <Input
                                    label="Kebele / ቀበሌ"
                                    placeholder="e.g. Kebele 08"
                                    value={formData.kebele}
                                    onChange={(e) => setFormData({ ...formData, kebele: e.target.value })}
                                />
                                <Input
                                    label="House Number / የቤት ቁጥር"
                                    placeholder="e.g. 1042"
                                    value={formData.houseNumber}
                                    onChange={(e) => setFormData({ ...formData, houseNumber: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* STEP 3: PARENT / GUARDIAN INFORMATION */}
            {currentStep === "GUARDIAN" && (
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50/75 border-b border-gray-100 py-3.5 px-5">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#4085b3]" />
                            Primary Parent / Guardian & Emergency Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Section A: Primary Guardian */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4085b3]" />
                                Primary Legal Guardian Details
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    label="Full Name / ሙሉ ስም *"
                                    placeholder="e.g. Almaz Tadesse"
                                    value={formData.guardianName}
                                    onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                                    required
                                />
                                <Select
                                    label="Relationship / ዝምድና *"
                                    value={formData.guardianRelationship}
                                    onChange={(e) => setFormData({ ...formData, guardianRelationship: e.target.value })}
                                    options={[
                                        { value: "Mother", label: "Mother / እናት" },
                                        { value: "Father", label: "Father / አባት" },
                                        { value: "Legal Guardian", label: "Legal Guardian / ሞግዚት" },
                                        { value: "Sibling", label: "Elder Sibling / ወንድም/እህት" },
                                        { value: "Other", label: "Other Relative" }
                                    ]}
                                    required
                                />
                                <Input
                                    label="Primary Phone / ስልክ ቁጥር *"
                                    placeholder="e.g. +251 91 234 5678"
                                    value={formData.guardianPhone}
                                    onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <Input
                                    label="Alternative Phone"
                                    placeholder="e.g. +251 92 876 5432"
                                    value={formData.guardianAltPhone}
                                    onChange={(e) => setFormData({ ...formData, guardianAltPhone: e.target.value })}
                                />
                                <Input
                                    label="Email Address (Optional)"
                                    type="email"
                                    placeholder="parent@example.com"
                                    value={formData.guardianEmail}
                                    onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-6 pt-2">
                                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.guardianCanPickup}
                                        onChange={(e) => setFormData({ ...formData, guardianCanPickup: e.target.checked })}
                                        className="rounded border-gray-300 text-[#4085b3] focus:ring-[#4085b3]"
                                    />
                                    <span>Authorized for Student Pickup</span>
                                </label>
                                <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.guardianIsPrimary}
                                        onChange={(e) => setFormData({ ...formData, guardianIsPrimary: e.target.checked })}
                                        className="rounded border-gray-300 text-[#4085b3] focus:ring-[#4085b3]"
                                    />
                                    <span>Designate as Primary Emergency Contact</span>
                                </label>
                            </div>
                        </div>

                        {/* Section B: Secondary Emergency Contact */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-1 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#4085b3]" />
                                Secondary Emergency Contact
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Input
                                    label="Emergency Contact Name"
                                    placeholder="e.g. Bekele Worku"
                                    value={formData.emergencyContactName}
                                    onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                                />
                                <Input
                                    label="Relationship"
                                    placeholder="e.g. Uncle / Aunt"
                                    value={formData.emergencyContactRelation}
                                    onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                                />
                                <Input
                                    label="Emergency Phone"
                                    placeholder="e.g. +251 94 000 0000"
                                    value={formData.emergencyContactPhone}
                                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* STEP 4: ACADEMIC INTAKE & ENROLLMENT */}
            {currentStep === "ENROLLMENT" && (
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50/75 border-b border-gray-100 py-3.5 px-5">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[#4085b3]" />
                            Academic Intake & Grade Level Cohort
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Notice Banner explaining Step 4 vs Step 5 Boundary */}
                        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-lg flex items-start gap-2.5">
                            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#4085b3]" />
                            <div>
                                <p className="font-bold">Step 4 Official Boundary: Unplaced Enrollment</p>
                                <p className="text-[11px] text-blue-700 mt-0.5">
                                    Student registration enrolls the student into the grade-level cohort. Specific classroom section allocation (e.g., Section A, Section B) is handled in <strong>Step 5 (Class & Teaching Management)</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Academic Year Selection */}
                            <Select
                                label="Target Academic Year *"
                                value={formData.academicYearId}
                                onChange={(e) => handleYearChange(e.target.value)}
                                options={academicYears.map(y => ({
                                    value: y.id,
                                    label: `${y.name} (${y.status})`
                                }))}
                                required
                            />

                            {/* Grade Cohort Selection */}
                            <Select
                                label="Intended Grade Level Cohort *"
                                value={formData.schoolGradeId}
                                onChange={(e) => setFormData({ ...formData, schoolGradeId: e.target.value })}
                                options={schoolGrades.map(sg => ({
                                    value: sg.id,
                                    label: `${sg.grade?.name || 'Grade'} (Capacity: ${sg.capacity || 'Open'})`
                                }))}
                                disabled={loadingGrades || schoolGrades.length === 0}
                                required
                            />

                            {/* Enrollment Type */}
                            <Select
                                label="Intake / Enrollment Category *"
                                value={formData.enrollmentType}
                                onChange={(e) => setFormData({ ...formData, enrollmentType: e.target.value })}
                                options={[
                                    { value: "NEW", label: "New Admission (አዲስ ምዝገባ)" },
                                    { value: "RETURNING", label: "Returning / Promotion (የነበረ ተማሪ)" },
                                    { value: "TRANSFER_IN", label: "Transfer-In (ዝውውር)" },
                                    { value: "RE_ENTRY", label: "Re-Entry / Readmission" }
                                ]}
                                required
                            />
                        </div>

                        {/* Transfer-In Fields if Applicable */}
                        {formData.enrollmentType === "TRANSFER_IN" && (
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                    Previous School Information (Transfer-In)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Previous School Name"
                                        placeholder="e.g. Menelik II Secondary School"
                                        value={formData.previousSchool}
                                        onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
                                    />
                                    <Input
                                        label="Previous Student ID / Code"
                                        placeholder="e.g. STU-2023-8891"
                                        value={formData.previousStudentId}
                                        onChange={(e) => setFormData({ ...formData, previousStudentId: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* STEP 5: SUPPORTING EVIDENCE & DOCUMENTS */}
            {currentStep === "DOCUMENTS" && (
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50/75 border-b border-gray-100 py-3.5 px-5">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <FileCheck className="w-4 h-4 text-[#4085b3]" />
                            Supporting Documents & Evidence
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        {/* Info Banner */}
                        <div className="flex items-start gap-2.5 p-3 bg-[#4085b3]/5 border border-[#4085b3]/20 rounded-lg">
                            <Info className="w-3.5 h-3.5 text-[#4085b3] mt-0.5 flex-shrink-0" />
                            <p className="text-[11px] text-[#32698e] leading-relaxed">
                                Upload files directly to secure cloud storage. Files are sent directly from your browser — the server only stores the link.
                                Accepted formats: <strong>PDF, JPEG, PNG</strong> · Max size: <strong>10 MB per file</strong>.
                            </p>
                        </div>

                        {/* Uploaders Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DocumentUploader
                                label="Birth Certificate / የልደት ምስክር"
                                badge="Mandatory"
                                badgeColor="amber"
                                description="Official vital event registration certificate issued by Kebele or relevant authority."
                                state={uploadBirthCert}
                                onChange={setUploadBirthCert}
                            />
                            <DocumentUploader
                                label="Parent / Guardian National ID"
                                badge="Recommended"
                                badgeColor="blue"
                                description="Valid Ethiopian Kebele ID or National Fayda ID card of the legal guardian."
                                state={uploadGuardianId}
                                onChange={setUploadGuardianId}
                            />
                            <DocumentUploader
                                label="Previous School Transcript"
                                badge="If Applicable"
                                badgeColor="gray"
                                description="Official academic report cards or regional exam result sheet from previous school."
                                state={uploadTranscript}
                                onChange={setUploadTranscript}
                            />
                            {formData.enrollmentType === "TRANSFER_IN" && (
                                <DocumentUploader
                                    label="Transfer Clearance Certificate"
                                    badge="Transfer-In Required"
                                    badgeColor="amber"
                                    description="Official clearance from the previous institution confirming transfer status."
                                    state={uploadTransferCert}
                                    onChange={setUploadTransferCert}
                                />
                            )}
                        </div>

                        {/* Upload Summary */}
                        <div className="flex items-center gap-4 pt-1 border-t border-gray-100">
                            <span className="text-[11px] text-gray-500">
                                {[uploadBirthCert, uploadGuardianId, uploadTranscript, uploadTransferCert]
                                    .filter(u => u.status === "done").length} of {[
                                        uploadBirthCert, uploadGuardianId, uploadTranscript,
                                        ...(formData.enrollmentType === "TRANSFER_IN" ? [uploadTransferCert] : [])
                                    ].length} document{[uploadBirthCert, uploadGuardianId, uploadTranscript].length !== 1 ? "s" : ""} uploaded
                            </span>
                            {[uploadBirthCert, uploadGuardianId, uploadTranscript, uploadTransferCert]
                                .some(u => u.status === "uploading") && (
                                <span className="flex items-center gap-1 text-[11px] text-[#4085b3]">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Upload in progress...
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* STEP 6: REVIEW & SUBMIT */}
            {currentStep === "REVIEW" && (
                <Card className="border-gray-200 shadow-sm">
                    <CardHeader className="bg-gray-50/75 border-b border-gray-100 py-3.5 px-5">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#4085b3]" />
                            Official Intake Summary & Verification
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {/* Summary Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Student Profile Card */}
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-2.5">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                    <span className="text-xs font-bold text-gray-900 uppercase">Student Identity</span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-[#4085b3]/10 text-[#4085b3] font-semibold">
                                        {intakeMode === "NEW" ? "New Admission" : "Returning Student"}
                                    </span>
                                </div>
                                <div className="text-xs space-y-1 text-gray-600">
                                    <p><strong className="text-gray-900">Full Name:</strong> {formData.firstName} {formData.fatherName} {formData.grandfatherName}</p>
                                    <p><strong className="text-gray-900">Gender:</strong> {formData.gender}</p>
                                    <p><strong className="text-gray-900">Date of Birth:</strong> {formData.dateOfBirth || "N/A"}</p>
                                    <p><strong className="text-gray-900">Location:</strong> {formData.city}, {formData.region}</p>
                                </div>
                            </div>

                            {/* Academic Intake Card */}
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-2.5">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                    <span className="text-xs font-bold text-gray-900 uppercase">Academic Placement</span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                                        Unplaced (Step 5)
                                    </span>
                                </div>
                                <div className="text-xs space-y-1 text-gray-600">
                                    <p><strong className="text-gray-900">Academic Year:</strong> {activeYear?.name || "N/A"}</p>
                                    <p><strong className="text-gray-900">Grade Level:</strong> {schoolGrades.find(g => g.id === formData.schoolGradeId)?.grade?.name || "Selected Grade"}</p>
                                    <p><strong className="text-gray-900">Intake Type:</strong> {formData.enrollmentType}</p>
                                    <p><strong className="text-gray-900">Section:</strong> Allocated in Step 5</p>
                                </div>
                            </div>

                            {/* Parent Details Card */}
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-2.5">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                    <span className="text-xs font-bold text-gray-900 uppercase">Primary Guardian</span>
                                </div>
                                <div className="text-xs space-y-1 text-gray-600">
                                    <p><strong className="text-gray-900">Name:</strong> {formData.guardianName}</p>
                                    <p><strong className="text-gray-900">Relationship:</strong> {formData.guardianRelationship}</p>
                                    <p><strong className="text-gray-900">Phone:</strong> {formData.guardianPhone}</p>
                                </div>
                            </div>

                            {/* Documents Attached Card */}
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 space-y-2.5">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                    <span className="text-xs font-bold text-gray-900 uppercase">Supporting Documents</span>
                                </div>
                                <div className="text-xs space-y-2 text-gray-600">
                                    {[
                                        { label: "Birth Certificate", state: uploadBirthCert },
                                        { label: "Guardian / Parent ID", state: uploadGuardianId },
                                        { label: "Previous Transcript", state: uploadTranscript },
                                        { label: "Transfer Certificate", state: uploadTransferCert },
                                    ].map(({ label, state }) => (
                                        <div key={label} className="flex items-center gap-1.5">
                                            {state.status === "done"
                                                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                                : <AlertCircle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                                            <span className={state.status === "done" ? "text-gray-900 font-medium" : "text-gray-400"}>
                                                {label}:
                                            </span>
                                            {state.status === "done" ? (
                                                <a href={state.publicUrl} target="_blank" rel="noopener noreferrer"
                                                    className="text-[#4085b3] hover:underline truncate max-w-[140px]">
                                                    {state.fileName}
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">Not uploaded</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                {currentStepIndex > 0 ? (
                    <Button 
                        variant="ghost" 
                        onClick={handleBack} 
                        disabled={submitting}
                        className="text-gray-600"
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                        Previous Step
                    </Button>
                ) : <div />}

                {currentStep !== "REVIEW" ? (
                    <Button 
                        onClick={handleNext}
                        className="bg-[#4085b3] hover:bg-[#32698e] text-white px-5 flex items-center gap-1.5"
                    >
                        <span>Continue to Next Step</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                ) : (
                    <Button 
                        onClick={handleSubmitRegistration} 
                        isLoading={submitting}
                        className="bg-[#4085b3] hover:bg-[#32698e] text-white px-6 font-bold"
                        leftIcon={<ShieldCheck className="w-4 h-4" />}
                    >
                        Confirm & Complete Registration
                    </Button>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════════ */}
            {/* ADMISSION CONFIRMATION & PARENT PORTAL ACCESS PASS MODAL               */}
            {/* ══════════════════════════════════════════════════════════════════════ */}
            {successResult && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in">
                    <div 
                        id="printable-admission-card"
                        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 relative text-slate-800 my-8"
                    >
                        {/* Printable CSS style */}
                        <style dangerouslySetInnerHTML={{ __html: `
                            @media print {
                                body * { visibility: hidden !important; }
                                #printable-admission-card, #printable-admission-card * { visibility: visible !important; }
                                #printable-admission-card {
                                    position: absolute !important;
                                    left: 0 !important;
                                    top: 0 !important;
                                    width: 100% !important;
                                    margin: 0 !important;
                                    border: 2px solid #0f172a !important;
                                    padding: 24px !important;
                                    box-shadow: none !important;
                                }
                                .no-print { display: none !important; }
                            }
                        `}} />

                        {/* Official Header */}
                        <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-sky-50 text-[#4085b3] rounded-xl flex items-center justify-center border border-sky-100 shadow-sm">
                                    <ShieldCheck className="w-7 h-7" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                                        Admission Confirmation & Parent Access Card
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">
                                        EduBridge Unified School System • Official Admission Slip
                                    </p>
                                </div>
                            </div>
                            <div className="no-print">
                                <button
                                    onClick={() => setSuccessResult(null)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Top Confirmation Badge */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-emerald-800 text-sm">
                            <div className="flex items-center space-x-2.5">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                <span className="font-semibold">Student Enrolled & Parent Account Ready</span>
                            </div>
                            <span className="text-xs px-2.5 py-0.5 bg-emerald-100 rounded-full font-bold uppercase tracking-wider text-emerald-800">
                                Official Record
                            </span>
                        </div>

                        {/* Student Details Summary */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                                Enrolled Student Profile
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                <div>
                                    <span className="text-slate-500 block">Full Name:</span>
                                    <span className="font-bold text-slate-900 text-sm">
                                        {successResult.student?.firstName} {successResult.student?.fatherName} {successResult.student?.grandfatherName || ""}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Student ID / Code:</span>
                                    <span className="font-mono font-bold text-[#4085b3] bg-sky-50 px-2 py-0.5 rounded border border-sky-200 text-sm inline-block">
                                        {successResult.student?.studentId}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Target Grade / Cohort:</span>
                                    <span className="font-semibold text-slate-900">
                                        {successResult.enrollment?.schoolGrade?.grade?.name || successResult.enrollment?.schoolGrade?.name || "Target Grade"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Academic Year:</span>
                                    <span className="font-semibold text-slate-900">
                                        {successResult.enrollment?.academicYear?.name || activeYear?.name || "Current Year"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Gender:</span>
                                    <span className="font-semibold text-slate-900">{successResult.student?.gender || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Enrollment Type:</span>
                                    <span className="font-semibold text-slate-900">{successResult.enrollment?.enrollmentType || "NEW"}</span>
                                </div>
                            </div>
                        </div>

                        {/* ✨ Automatically Provisioned Parent Login Account Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    <span>Parent Portal Access Credentials</span>
                                </h3>
                                <span className="text-[11px] text-slate-500">
                                    Instant self-service dashboard access
                                </span>
                            </div>

                            {(successResult.parentCredentials && successResult.parentCredentials.length > 0) ? (
                                successResult.parentCredentials.map((cred: any, idx: number) => (
                                    <div 
                                        key={idx} 
                                        className="bg-white border-2 border-[#4085b3]/30 rounded-xl p-4 shadow-sm relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 h-full w-1.5 bg-[#4085b3]" />
                                        
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-[#4085b3]" />
                                                <span>{cred.parentName}</span>
                                                <span className="text-xs font-normal text-slate-500">
                                                    ({cred.relationship || "Guardian"})
                                                </span>
                                            </div>

                                            {cred.isNewAccount ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <Sparkles className="w-3 h-3 text-emerald-600" />
                                                    Parent Account Automatically Created
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-[#4085b3] border border-sky-200">
                                                    <Users className="w-3 h-3 text-[#4085b3]" />
                                                    Existing Parent Account Linked
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                                            <div>
                                                <span className="text-slate-500 block mb-0.5">Login ID (Phone Number or Email):</span>
                                                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-300 font-mono font-bold text-slate-900">
                                                    <span>{cred.loginId}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(cred.loginId);
                                                            setCopiedKey(`login-${idx}`);
                                                            setTimeout(() => setCopiedKey(null), 2000);
                                                        }}
                                                        className="text-slate-400 hover:text-[#4085b3] transition-colors ml-2 no-print"
                                                        title="Copy Login ID"
                                                    >
                                                        {copiedKey === `login-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-slate-500 block mb-0.5">Initial Default Password:</span>
                                                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-300 font-mono font-bold text-[#4085b3]">
                                                    <span>{cred.initialPassword}</span>
                                                    {cred.initialPassword !== "(Existing Account)" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(cred.initialPassword);
                                                                setCopiedKey(`pass-${idx}`);
                                                                setTimeout(() => setCopiedKey(null), 2000);
                                                            }}
                                                            className="text-slate-400 hover:text-[#4085b3] transition-colors ml-2 no-print"
                                                            title="Copy Password"
                                                        >
                                                            {copiedKey === `pass-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                                            <span>
                                                {cred.isNewAccount 
                                                    ? "🔒 Prompted to set a personal password upon first sign-in." 
                                                    : "✨ All enrolled children are connected to this single Parent Dashboard."}
                                            </span>
                                            <span className="font-semibold text-slate-700">Role: PARENT</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600">
                                    Guardian details registered with student. Login is available using phone number: <strong>{formData.guardianPhone || "Registered phone number"}</strong>.
                                </div>
                            )}
                        </div>

                        {/* How the Parent Accesses Their Dashboard (Instructions Box) */}
                        <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
                            <div className="font-bold text-[#4085b3] flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5" />
                                <span>How the Parent Accesses Their Dashboard:</span>
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px] leading-relaxed">
                                <li>Parent goes to the EduBridge portal at <strong>/auth/login</strong>.</li>
                                <li>Enters their mobile phone number and the initial password.</li>
                                <li>Instant access to Attendance, Results, Report Cards, and Teacher Communication.</li>
                            </ol>
                        </div>

                        {/* Modal Action Bar */}
                        <div className="no-print pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2 font-semibold shadow-sm"
                                    leftIcon={<Printer className="w-3.5 h-3.5" />}
                                >
                                    Print Access Pass
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        const cred = successResult.parentCredentials?.[0];
                                        const origin = typeof window !== "undefined" ? window.location.origin : "";
                                        const clipText = `EduBridge Parent Portal Access Pass\nStudent: ${successResult.student?.firstName} ${successResult.student?.fatherName} (ID: ${successResult.student?.studentId})\nParent: ${cred?.parentName || formData.guardianName}\nUsername / Phone: ${cred?.loginId || formData.guardianPhone}\nPassword: ${cred?.initialPassword || "EduBridge2026!"}\nLogin Link: ${origin}/login`;
                                        navigator.clipboard.writeText(clipText);
                                        setCopiedKey("all-creds");
                                        setTimeout(() => setCopiedKey(null), 2000);
                                    }}
                                    className="text-xs text-slate-700 border-slate-300 hover:bg-slate-50"
                                    leftIcon={copiedKey === "all-creds" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                >
                                    {copiedKey === "all-creds" ? "Copied All Credentials!" : "Copy Details"}
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleResetForm}
                                    className="text-xs text-[#4085b3] border-[#4085b3]/30 hover:bg-sky-50 font-semibold"
                                    leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                                >
                                    Register Another Student
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => router.push("/dashboard/students/enrollments")}
                                    className="bg-[#4085b3] hover:bg-[#32698e] text-white text-xs px-4 py-2 font-bold shadow-sm flex items-center gap-1"
                                >
                                    <span>View Enrollments</span>
                                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
