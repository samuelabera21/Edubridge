"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { 
    ArrowLeft, User, GraduationCap, MapPin, BookOpen, Save, 
    Plus, Trash2, CheckCircle2, ShieldCheck, Briefcase, Award,
    FileText, Calendar, Layers, Check, X, AlertCircle, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";

interface QualificationItem {
    qualificationLevel: "CERTIFICATE" | "DIPLOMA" | "BACHELORS" | "MASTERS" | "DOCTORATE" | "OTHER";
    qualificationTitle: string;
    fieldOfStudy: string;
    institution: string;
    graduationYear: number;
    credentialNumber: string;
    country: string;
    isHighest: boolean;
}

export default function TeacherRegistrationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        // 1. Personal / Identity
        firstName: "",
        fatherName: "",
        grandfatherName: "",
        lastName: "",
        gender: "MALE",
        dateOfBirth: "",
        nationality: "Ethiopian",
        nationalIdNumber: "",
        photoUrl: "",

        // 2. Employment
        employmentType: "PERMANENT",
        employmentStatus: "ACTIVE",
        joiningDate: new Date().toISOString().split("T")[0],
        jobTitle: "Teacher",
        staffIdCode: "",
        employeeId: "",

        // 3. Contact & Address
        phoneNumber: "",
        email: "",
        region: "Addis Ababa",
        zone: "",
        woreda: "",
        city: "Addis Ababa",
        kebele: "",
        houseNumber: "",

        // 4. Teaching Eligibility
        cycle: "SECONDARY_FIRST_CYCLE",
        primarySubjectId: "",
        additionalSubjectIds: [] as string[]
    });

    // Dynamic Qualifications List
    const [qualifications, setQualifications] = useState<QualificationItem[]>([
        {
            qualificationLevel: "BACHELORS",
            qualificationTitle: "",
            fieldOfStudy: "",
            institution: "",
            graduationYear: new Date().getFullYear() - 4,
            credentialNumber: "",
            country: "Ethiopia",
            isHighest: true
        }
    ]);

    // Success Modal State
    const [successModal, setSuccessModal] = useState<{
        open: boolean;
        teacherId: string;
        name: string;
        staffId: string;
    }>({
        open: false,
        teacherId: "",
        name: "",
        staffId: ""
    });

    useEffect(() => {
        const loadSubjects = async () => {
            try {
                const res = await fetchApi("/academic/subjects");
                if (res.ok) {
                    const data = await res.json();
                    setSubjects(data || []);
                    if (data.length > 0) {
                        setFormData(prev => ({ ...prev, primarySubjectId: data[0].id }));
                    }
                }
            } catch (err) {
                console.error("Failed to load subjects", err);
            }
        };
        loadSubjects();
    }, []);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleQualificationChange = (index: number, field: keyof QualificationItem, value: any) => {
        setQualifications(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const addQualification = () => {
        setQualifications(prev => [
            ...prev,
            {
                qualificationLevel: "DIPLOMA",
                qualificationTitle: "",
                fieldOfStudy: "",
                institution: "",
                graduationYear: new Date().getFullYear() - 6,
                credentialNumber: "",
                country: "Ethiopia",
                isHighest: false
            }
        ]);
    };

    const removeQualification = (index: number) => {
        if (qualifications.length <= 1) return;
        setQualifications(prev => prev.filter((_, i) => i !== index));
    };

    const handleAdditionalSubjectToggle = (subjId: string) => {
        setFormData(prev => {
            const exists = prev.additionalSubjectIds.includes(subjId);
            return {
                ...prev,
                additionalSubjectIds: exists
                    ? prev.additionalSubjectIds.filter(id => id !== subjId)
                    : [...prev.additionalSubjectIds, subjId]
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Required Validations
        if (!formData.firstName.trim()) return setError("First / Given Name is required.");
        if (!formData.fatherName.trim()) return setError("Father's Name is required under Ethiopian naming standards.");
        if (!formData.lastName.trim()) return setError("Grandfather's / Family Name is required.");
        if (!formData.gender) return setError("Gender selection is required.");

        // Validate qualifications
        const validQualifications = qualifications.filter(q => q.qualificationTitle.trim() && q.institution.trim());
        if (validQualifications.length === 0) {
            return setError("Please specify at least one professional qualification with title and institution.");
        }

        setLoading(true);

        try {
            // Build specializations payload
            const specializations: any[] = [];
            if (formData.primarySubjectId) {
                specializations.push({
                    subjectId: formData.primarySubjectId,
                    cycle: formData.cycle,
                    isPrimary: true
                });
            }
            formData.additionalSubjectIds.forEach(subId => {
                if (subId !== formData.primarySubjectId) {
                    specializations.push({
                        subjectId: subId,
                        cycle: formData.cycle,
                        isPrimary: false
                    });
                }
            });

            const payload = {
                firstName: formData.firstName,
                fatherName: formData.fatherName,
                grandfatherName: formData.grandfatherName || null,
                lastName: formData.lastName,
                gender: formData.gender,
                dateOfBirth: formData.dateOfBirth || null,
                nationality: formData.nationality,
                nationalIdNumber: formData.nationalIdNumber || null,
                photoUrl: formData.photoUrl || null,

                employmentType: formData.employmentType,
                employmentStatus: formData.employmentStatus,
                joiningDate: formData.joiningDate,
                jobTitle: formData.jobTitle,
                staffIdCode: formData.staffIdCode || null,
                employeeId: formData.employeeId || null,

                phoneNumber: formData.phoneNumber || null,
                email: formData.email || null,
                region: formData.region || null,
                zone: formData.zone || null,
                woreda: formData.woreda || null,
                city: formData.city || null,
                kebele: formData.kebele || null,
                houseNumber: formData.houseNumber || null,

                qualifications: validQualifications,
                specializations: specializations
            };

            const res = await fetchApi("/teacher", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to register teacher");
            }

            const createdTeacher = await res.json();

            setSuccessModal({
                open: true,
                teacherId: createdTeacher.id,
                name: `${createdTeacher.firstName} ${createdTeacher.fatherName} ${createdTeacher.lastName}`,
                staffId: createdTeacher.staffIdCode || createdTeacher.employeeId || "Staff"
            });
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred during teacher registration.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-16">
            {/* Header & Back Link */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => router.push("/dashboard/teachers")}
                        className="mb-1 text-gray-500 hover:text-gray-900"
                        leftIcon={<ArrowLeft className="w-4 h-4" />}
                    >
                        Back to Teacher Directory
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <GraduationCap className="w-7 h-7 text-[#006b3f]" />
                        <span>Register Faculty Member</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Register teacher credentials, professional qualifications, and subject specializations
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* SECTION 1: Personal & Identity Information */}
                <Card className="shadow-2xs border border-gray-200">
                    <CardHeader className="bg-gray-50/70 py-3.5 border-b border-gray-100">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                            <User className="w-4 h-4 text-[#006b3f]" />
                            <span>1. Personal & Identity Information (Ethiopian Standard)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Given Name (የመጀመሪያ ስም) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleTextChange}
                                    placeholder="e.g. Abebe"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Father's Name (የአባት ስም) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="fatherName"
                                    value={formData.fatherName}
                                    onChange={handleTextChange}
                                    placeholder="e.g. Kebede"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Grandfather's Name (የአያት ስም) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleTextChange}
                                    placeholder="e.g. Tadesse"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Gender <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#006b3f]"
                                    required
                                >
                                    <option value="MALE">Male (ወንድ)</option>
                                    <option value="FEMALE">Female (ሴት)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Nationality
                                </label>
                                <input
                                    type="text"
                                    name="nationality"
                                    value={formData.nationality}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    National ID / Fayda ID (Optional)
                                </label>
                                <input
                                    type="text"
                                    name="nationalIdNumber"
                                    value={formData.nationalIdNumber}
                                    onChange={handleTextChange}
                                    placeholder="e.g. FAN-987654"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* SECTION 2: Employment Lifecycle Information */}
                <Card className="shadow-2xs border border-gray-200">
                    <CardHeader className="bg-gray-50/70 py-3.5 border-b border-gray-100">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                            <Briefcase className="w-4 h-4 text-[#006b3f]" />
                            <span>2. Employment & Appointment Information</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Employment Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="employmentType"
                                    value={formData.employmentType}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#006b3f]"
                                    required
                                >
                                    <option value="PERMANENT">Permanent (ቋሚ)</option>
                                    <option value="CONTRACT">Contract (ኮንትራት)</option>
                                    <option value="PART_TIME">Part-Time (የትርፍ ጊዜ)</option>
                                    <option value="TRANSFER_IN">Transferred In (ዝውውር)</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Employment Status <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="employmentStatus"
                                    value={formData.employmentStatus}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#006b3f]"
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
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Appointment / Joining Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="joiningDate"
                                    value={formData.joiningDate}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Job / Professional Title
                                </label>
                                <input
                                    type="text"
                                    name="jobTitle"
                                    value={formData.jobTitle}
                                    onChange={handleTextChange}
                                    placeholder="e.g. Senior Secondary Physics Teacher"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    School Staff Code / Employee ID
                                </label>
                                <input
                                    type="text"
                                    name="staffIdCode"
                                    value={formData.staffIdCode}
                                    onChange={handleTextChange}
                                    placeholder="e.g. TCH-2026-001 (Leave blank to auto-generate)"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* SECTION 3: Professional Qualifications (MoE Reporting & ESAA Standards) */}
                <Card className="shadow-2xs border border-gray-200">
                    <CardHeader className="bg-gray-50/70 py-3.5 border-b border-gray-100 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                                <Award className="w-4 h-4 text-[#006b3f]" />
                                <span>3. Professional Qualifications & Degrees</span>
                            </CardTitle>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Add all authentic academic qualifications. Initial verification state will be set to Pending.
                            </p>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addQualification}
                            leftIcon={<Plus className="w-3.5 h-3.5" />}
                            className="text-xs text-[#006b3f] border-[#006b3f]/30"
                        >
                            Add Qualification
                        </Button>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        {qualifications.map((q, idx) => (
                            <div key={idx} className="p-4 bg-gray-50/60 rounded-xl border border-gray-200 space-y-3 relative">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-700">
                                        Qualification #{idx + 1}
                                    </span>
                                    {qualifications.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeQualification(idx)}
                                            className="text-gray-400 hover:text-red-600 transition-colors"
                                            title="Remove this qualification"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Qualification Level <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={q.qualificationLevel}
                                            onChange={(e) => handleQualificationChange(idx, "qualificationLevel", e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white"
                                            required
                                        >
                                            <option value="CERTIFICATE">Certificate (የምስክር ወረቀት)</option>
                                            <option value="DIPLOMA">Diploma (ዲፕሎማ)</option>
                                            <option value="BACHELORS">Bachelor's / First Degree (የመጀመሪያ ዲግሪ)</option>
                                            <option value="MASTERS">Master's Degree (ሁለተኛ ዲግሪ)</option>
                                            <option value="DOCTORATE">Doctorate / PhD (ዶክትሬት)</option>
                                            <option value="OTHER">Other Recognized Qualification</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Qualification Title <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={q.qualificationTitle}
                                            onChange={(e) => handleQualificationChange(idx, "qualificationTitle", e.target.value)}
                                            placeholder="e.g. BEd in Physics"
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Major Field of Study <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={q.fieldOfStudy}
                                            onChange={(e) => handleQualificationChange(idx, "fieldOfStudy", e.target.value)}
                                            placeholder="e.g. Physics Education"
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Awarding University / College <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={q.institution}
                                            onChange={(e) => handleQualificationChange(idx, "institution", e.target.value)}
                                            placeholder="e.g. Addis Ababa University"
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Graduation Year <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="1960"
                                            max={new Date().getFullYear() + 1}
                                            value={q.graduationYear}
                                            onChange={(e) => handleQualificationChange(idx, "graduationYear", Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                                            Credential Serial Number
                                        </label>
                                        <input
                                            type="text"
                                            value={q.credentialNumber}
                                            onChange={(e) => handleQualificationChange(idx, "credentialNumber", e.target.value)}
                                            placeholder="e.g. AAU-123456"
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* SECTION 4: Teaching Eligibility & Subject Specializations */}
                <Card className="shadow-2xs border border-gray-200">
                    <CardHeader className="bg-gray-50/70 py-3.5 border-b border-gray-100">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                            <BookOpen className="w-4 h-4 text-[#006b3f]" />
                            <span>4. Teaching Eligibility & Subject Specializations</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Eligible Education Cycle <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="cycle"
                                    value={formData.cycle}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#006b3f]"
                                    required
                                >
                                    <option value="PRIMARY_FIRST_CYCLE">Primary 1st Cycle (Grades 1–4)</option>
                                    <option value="PRIMARY_SECOND_CYCLE">Primary 2nd Cycle (Grades 5–8 / Middle)</option>
                                    <option value="SECONDARY_FIRST_CYCLE">Secondary 1st Cycle (Grades 9–10)</option>
                                    <option value="SECONDARY_SECOND_CYCLE">Secondary 2nd Cycle (Grades 11–12)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Primary Subject Specialization <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="primarySubjectId"
                                    value={formData.primarySubjectId}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-[#006b3f]"
                                    required
                                >
                                    <option value="">Select Primary Specialization...</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code || "Core"})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Additional Specializations */}
                        {subjects.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2">
                                    Additional Subject Competencies (Secondary Specializations)
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {subjects
                                        .filter(s => s.id !== formData.primarySubjectId)
                                        .map(s => {
                                            const isSelected = formData.additionalSubjectIds.includes(s.id);
                                            return (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => handleAdditionalSubjectToggle(s.id)}
                                                    className={`p-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between ${
                                                        isSelected
                                                            ? "bg-emerald-50 border-[#006b3f] text-[#006b3f] font-semibold"
                                                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                                    }`}
                                                >
                                                    <span className="truncate">{s.name}</span>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-[#006b3f] flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* SECTION 5: Contact & Location */}
                <Card className="shadow-2xs border border-gray-200">
                    <CardHeader className="bg-gray-50/70 py-3.5 border-b border-gray-100">
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-[#006b3f]" />
                            <span>5. Contact & Residence Details</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Phone Number (ስልክ ቁጥር)
                                </label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleTextChange}
                                    placeholder="+251 9XX XXXXXX"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Email Address (ኢሜይል)
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleTextChange}
                                    placeholder="teacher@school.edu.et"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Region</label>
                                <input
                                    type="text"
                                    name="region"
                                    value={formData.region}
                                    onChange={handleTextChange}
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Sub-City / Zone</label>
                                <input
                                    type="text"
                                    name="zone"
                                    value={formData.zone}
                                    onChange={handleTextChange}
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Woreda</label>
                                <input
                                    type="text"
                                    name="woreda"
                                    value={formData.woreda}
                                    onChange={handleTextChange}
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">City / Town</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleTextChange}
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Submit Action Bar */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => router.push("/dashboard/teachers")}
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        isLoading={loading}
                        className="bg-[#006b3f] hover:bg-[#005432] text-white px-6 font-semibold"
                        leftIcon={<Save className="w-4 h-4" />}
                    >
                        Register Faculty Member
                    </Button>
                </div>
            </form>

            {/* Post-Registration Success Modal */}
            <Modal
                isOpen={successModal.open}
                onClose={() => router.push("/dashboard/teachers")}
                title="Teacher Profile Registered Successfully"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center space-x-3">
                        <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-emerald-950">{successModal.name}</p>
                            <p className="text-xs text-emerald-700">Staff ID: {successModal.staffId}</p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-600">
                        The faculty member's credentials, qualifications, and subject specializations have been officially registered. 
                        Their credentials are now queued for administrative verification.
                    </p>

                    <div className="pt-3 border-t border-gray-100 flex flex-col space-y-2">
                        <Button
                            className="w-full bg-[#006b3f] hover:bg-[#005432] text-white text-xs"
                            onClick={() => router.push(`/dashboard/teachers/${successModal.teacherId}`)}
                        >
                            View Teacher Profile & Verify Credentials
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full text-xs"
                            onClick={() => router.push(`/dashboard/teachers/assignments`)}
                        >
                            Proceed to Instructional Staffing Allocation
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-xs text-gray-500"
                            onClick={() => router.push("/dashboard/teachers")}
                        >
                            Return to Faculty Directory
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
