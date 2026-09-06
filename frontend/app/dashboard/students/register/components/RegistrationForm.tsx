"use client";

import React, { useState, useEffect } from "react";
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
    Upload, 
    Info, 
    RefreshCw, 
    ShieldCheck, 
    Check,
    Phone,
    Home,
    FileCheck
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { fetchApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { AcademicYear } from "@/types/api";

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

            // Build Documents Array
            const docList = [];
            if (formData.birthCertUrl) {
                docList.push({
                    documentType: "BIRTH_CERTIFICATE",
                    title: formData.birthCertTitle || "Birth Certificate",
                    fileUrl: formData.birthCertUrl
                });
            }
            if (formData.guardianIdUrl) {
                docList.push({
                    documentType: "GUARDIAN_ID",
                    title: formData.guardianIdTitle || "Guardian Identification Card",
                    fileUrl: formData.guardianIdUrl
                });
            }
            if (formData.transcriptUrl) {
                docList.push({
                    documentType: "PREVIOUS_TRANSCRIPT",
                    title: formData.transcriptTitle || "Official Academic Transcript",
                    fileUrl: formData.transcriptUrl
                });
            }
            if (formData.transferCertUrl) {
                docList.push({
                    documentType: "TRANSFER_CERTIFICATE",
                    title: formData.transferCertTitle || "Official Transfer Clearance",
                    fileUrl: formData.transferCertUrl
                });
            }

            // Build Guardians Array
            const guardianList = [];
            if (formData.guardianName) {
                guardianList.push({
                    fullName: formData.guardianName,
                    relationship: formData.guardianRelationship,
                    phone: formData.guardianPhone,
                    altPhone: formData.guardianAltPhone || undefined,
                    email: formData.guardianEmail || undefined,
                    isPrimary: formData.guardianIsPrimary,
                    canPickup: formData.guardianCanPickup
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
            setSuccessMessage(
                `Student ${resData.student?.firstName} ${resData.student?.fatherName} successfully registered! ID: ${resData.student?.studentId}`
            );

            setTimeout(() => {
                router.push("/dashboard/students/enrollments");
            }, 1800);
        } catch (err: any) {
            setError(err.message || "An error occurred during student registration");
        } finally {
            setSubmitting(false);
        }
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
                            Official Supporting Evidence & Verification Records
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <p className="text-xs text-gray-500">
                            Provide URLs or references for official documents required by the Ethiopian Ministry of Education.
                        </p>

                        <div className="space-y-4">
                            {/* Document 1: Birth Certificate */}
                            <div className="p-4 border border-gray-200 rounded-lg bg-white flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-900">1. Birth Certificate / የልደት ምስክር ወረቀት</span>
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Mandatory</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Official vital event registration certificate.</p>
                                </div>
                                <div className="w-full md:w-80">
                                    <Input
                                        placeholder="Document URL or File ID (e.g. https://...)"
                                        value={formData.birthCertUrl}
                                        onChange={(e) => setFormData({ ...formData, birthCertUrl: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Document 2: Guardian ID */}
                            <div className="p-4 border border-gray-200 rounded-lg bg-white flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-900">2. Parent / Guardian Kebele or National ID</span>
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Recommended</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Valid Ethiopian ID card for legal guardian verification.</p>
                                </div>
                                <div className="w-full md:w-80">
                                    <Input
                                        placeholder="Document URL or File ID"
                                        value={formData.guardianIdUrl}
                                        onChange={(e) => setFormData({ ...formData, guardianIdUrl: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Document 3: Previous Transcript */}
                            <div className="p-4 border border-gray-200 rounded-lg bg-white flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-900">3. Previous School Official Academic Transcript</span>
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">If Applicable</span>
                                    </div>
                                    <p className="text-xs text-gray-500">Official report cards from previous grades or regional examination results.</p>
                                </div>
                                <div className="w-full md:w-80">
                                    <Input
                                        placeholder="Document URL or File ID"
                                        value={formData.transcriptUrl}
                                        onChange={(e) => setFormData({ ...formData, transcriptUrl: e.target.value })}
                                    />
                                </div>
                            </div>
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
                                    <span className="text-xs font-bold text-gray-900 uppercase">Evidence & Documents</span>
                                </div>
                                <div className="text-xs space-y-1 text-gray-600">
                                    <p className="flex items-center gap-1.5">
                                        {formData.birthCertUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-gray-400" />}
                                        Birth Certificate: {formData.birthCertUrl ? "Attached" : "Not Provided"}
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        {formData.guardianIdUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-gray-400" />}
                                        Guardian ID: {formData.guardianIdUrl ? "Attached" : "Not Provided"}
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        {formData.transcriptUrl ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-gray-400" />}
                                        Transcript: {formData.transcriptUrl ? "Attached" : "Not Provided"}
                                    </p>
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
        </div>
    );
}
