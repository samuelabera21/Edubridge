"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { 
    ArrowLeft, Plus, Trash2, CheckCircle2, Check, AlertCircle, Save
} from "lucide-react";
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
        setLoading(true);

        try {
            // Validation
            if (!formData.firstName.trim() || !formData.fatherName.trim()) {
                throw new Error("Given name and Father's name are required.");
            }

            // Map lastName to grandfather name if blank
            const effectiveLastName = formData.grandfatherName.trim() || formData.lastName.trim() || formData.fatherName.trim();

            const payload = {
                firstName: formData.firstName.trim(),
                fatherName: formData.fatherName.trim(),
                grandfatherName: formData.grandfatherName.trim(),
                lastName: effectiveLastName,
                gender: formData.gender,
                dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : undefined,
                nationality: formData.nationality,
                nationalIdNumber: formData.nationalIdNumber.trim() || undefined,
                photoUrl: formData.photoUrl || undefined,

                employmentType: formData.employmentType,
                employmentStatus: formData.employmentStatus,
                joiningDate: new Date(formData.joiningDate).toISOString(),
                jobTitle: formData.jobTitle.trim() || "Teacher",
                staffIdCode: formData.staffIdCode.trim() || undefined,
                employeeId: formData.employeeId.trim() || undefined,

                phoneNumber: formData.phoneNumber.trim() || undefined,
                email: formData.email.trim() || undefined,
                region: formData.region.trim() || undefined,
                zone: formData.zone.trim() || undefined,
                woreda: formData.woreda.trim() || undefined,
                city: formData.city.trim() || undefined,
                kebele: formData.kebele.trim() || undefined,
                houseNumber: formData.houseNumber.trim() || undefined,

                cycle: formData.cycle,
                primarySubjectId: formData.primarySubjectId || undefined,
                additionalSubjectIds: formData.additionalSubjectIds,

                qualifications: qualifications.filter(q => q.qualificationTitle.trim() || q.fieldOfStudy.trim()).map((q, idx) => ({
                    ...q,
                    isHighest: idx === 0
                }))
            };

            const res = await fetchApi("/teacher", {
                method: "POST",
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to register teacher");
            }

            const created = await res.json();
            setSuccessModal({
                open: true,
                teacherId: created.id,
                name: `${created.firstName} ${created.fatherName || ""} ${created.lastName || ""}`.trim(),
                staffId: created.staffIdCode || created.employeeId || "Generated"
            });
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5 max-w-5xl mx-auto pb-16 font-sans text-gray-900">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/teachers" className="hover:text-gray-900">Teachers</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">Register</span>
            </div>

            {/* Clean Government Header Bar */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard/teachers")}
                        className="inline-flex items-center space-x-1.5 text-xs text-gray-700 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Directory</span>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                            Register Teacher
                        </h1>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-2.5 rounded-md flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 cursor-pointer">&times;</button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* SECTION 1: Personal & Identity Information */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-200">
                        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                            1. Personal & Identity Information
                        </h2>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Given Name (የመጀመሪያ ስም) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleTextChange}
                                    placeholder="e.g. Abebe"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Father's Name (የአባት ስም) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="fatherName"
                                    value={formData.fatherName}
                                    onChange={handleTextChange}
                                    placeholder="e.g. Kebede"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Grandfather's Name (የአያት ስም) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="grandfatherName"
                                    value={formData.grandfatherName}
                                    onChange={handleTextChange}
                                    placeholder="e.g. Tadesse"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Gender <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                                    required
                                >
                                    <option value="MALE">Male (ወንድ)</option>
                                    <option value="FEMALE">Female (ሴት)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Date of Birth
                                </label>
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    value={formData.dateOfBirth}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Nationality
                                </label>
                                <input
                                    type="text"
                                    name="nationality"
                                    value={formData.nationality}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    National ID / Fayda ID
                                </label>
                                <input
                                    type="text"
                                    name="nationalIdNumber"
                                    value={formData.nationalIdNumber}
                                    onChange={handleTextChange}
                                    placeholder="e.g. FAN-987654"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: Employment Information */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-200">
                        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                            2. Employment Information
                        </h2>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Employment Type <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    name="employmentType"
                                    value={formData.employmentType}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                                    required
                                >
                                    <option value="PERMANENT">Permanent</option>
                                    <option value="CONTRACT">Contract</option>
                                    <option value="PART_TIME">Part-Time</option>
                                    <option value="TRANSFER_IN">Transferred In</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Employment Status <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    name="employmentStatus"
                                    value={formData.employmentStatus}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                                    required
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="ON_LEAVE">On Leave</option>
                                    <option value="TRANSFERRED">Transferred</option>
                                    <option value="RESIGNED">Resigned</option>
                                    <option value="RETIRED">Retired</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Appointment / Joining Date <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="joiningDate"
                                    value={formData.joiningDate}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Job Title
                                </label>
                                <input
                                    type="text"
                                    name="jobTitle"
                                    value={formData.jobTitle}
                                    onChange={handleTextChange}
                                    placeholder="e.g. Teacher"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Staff Code / Employee ID
                                </label>
                                <input
                                    type="text"
                                    name="staffIdCode"
                                    value={formData.staffIdCode}
                                    onChange={handleTextChange}
                                    placeholder="Leave blank to auto-generate"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: Professional Qualifications */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                            3. Professional Qualifications & Degrees
                        </h2>
                        <button
                            type="button"
                            onClick={addQualification}
                            className="inline-flex items-center space-x-1 text-xs text-[#4085b3] hover:text-[#2b6a94] font-medium cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Qualification</span>
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        {qualifications.map((q, idx) => (
                            <div key={idx} className="p-4 bg-gray-50/60 rounded-md border border-gray-200 space-y-3 relative">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-gray-700">
                                        Qualification #{idx + 1}
                                    </span>
                                    {qualifications.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeQualification(idx)}
                                            className="text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                                            title="Remove qualification"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                            Level <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={q.qualificationLevel}
                                            onChange={(e) => handleQualificationChange(idx, "qualificationLevel", e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#4085b3] outline-none cursor-pointer"
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
                                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                            Qualification Title <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={q.qualificationTitle}
                                            onChange={(e) => handleQualificationChange(idx, "qualificationTitle", e.target.value)}
                                            placeholder="e.g. BEd in Physics"
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                            Major Field of Study <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={q.fieldOfStudy}
                                            onChange={(e) => handleQualificationChange(idx, "fieldOfStudy", e.target.value)}
                                            placeholder="e.g. Physics Education"
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                            Awarding University / College <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={q.institution}
                                            onChange={(e) => handleQualificationChange(idx, "institution", e.target.value)}
                                            placeholder="e.g. Addis Ababa University"
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                            Graduation Year <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="1960"
                                            max={new Date().getFullYear() + 1}
                                            value={q.graduationYear}
                                            onChange={(e) => handleQualificationChange(idx, "graduationYear", Number(e.target.value))}
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                            Credential Serial Number
                                        </label>
                                        <input
                                            type="text"
                                            value={q.credentialNumber}
                                            onChange={(e) => handleQualificationChange(idx, "credentialNumber", e.target.value)}
                                            placeholder="e.g. AAU-123456"
                                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECTION 4: Teaching Eligibility & Subject Specializations */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-200">
                        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                            4. Teaching Eligibility & Specializations
                        </h2>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Eligible Education Cycle <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    name="cycle"
                                    value={formData.cycle}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                                    required
                                >
                                    <option value="PRIMARY_FIRST_CYCLE">Primary 1st Cycle (Grades 1–4)</option>
                                    <option value="PRIMARY_SECOND_CYCLE">Primary 2nd Cycle (Grades 5–8)</option>
                                    <option value="SECONDARY_FIRST_CYCLE">Secondary 1st Cycle (Grades 9–10)</option>
                                    <option value="SECONDARY_SECOND_CYCLE">Secondary 2nd Cycle (Grades 11–12)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Primary Subject Specialization <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    name="primarySubjectId"
                                    value={formData.primarySubjectId}
                                    onChange={handleTextChange}
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
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
                                <label className="block text-xs font-medium text-gray-700 mb-2">
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
                                                    className={`p-2 rounded-md border text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                                                        isSelected
                                                            ? "bg-sky-50 border-[#4085b3] text-[#4085b3] font-semibold"
                                                            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                                                    }`}
                                                >
                                                    <span className="truncate">{s.name}</span>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-[#4085b3] flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* SECTION 5: Contact & Residence Details */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                    <div className="px-5 py-3.5 bg-gray-50/70 border-b border-gray-200">
                        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                            5. Contact & Residence Details
                        </h2>
                    </div>
                    <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Phone Number (ስልክ ቁጥር)
                                </label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleTextChange}
                                    placeholder="+251 9XX XXXXXX"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleTextChange}
                                    placeholder="teacher@school.edu.et"
                                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
                                <input
                                    type="text"
                                    name="region"
                                    value={formData.region}
                                    onChange={handleTextChange}
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Sub-City / Zone</label>
                                <input
                                    type="text"
                                    name="zone"
                                    value={formData.zone}
                                    onChange={handleTextChange}
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Woreda</label>
                                <input
                                    type="text"
                                    name="woreda"
                                    value={formData.woreda}
                                    onChange={handleTextChange}
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">City / Town</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleTextChange}
                                    className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Action Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <button 
                        type="button" 
                        onClick={() => router.push("/dashboard/teachers")}
                        className="px-4 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="inline-flex items-center space-x-1.5 px-6 py-2 text-xs font-medium text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-md transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>{loading ? "Registering..." : "Register Teacher"}</span>
                    </button>
                </div>
            </form>

            {/* Post-Registration Success Modal */}
            <Modal
                isOpen={successModal.open}
                onClose={() => router.push("/dashboard/teachers")}
                title="Teacher Registered Successfully"
            >
                <div className="space-y-4">
                    <div className="p-3.5 bg-emerald-50 rounded-md border border-emerald-200 flex items-center space-x-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                        <div>
                            <p className="text-xs font-bold text-emerald-950">{successModal.name}</p>
                            <p className="text-[11px] text-emerald-700 font-mono">Staff ID: {successModal.staffId}</p>
                        </div>
                    </div>

                    <p className="text-xs text-gray-600">
                        The teacher's credentials, qualifications, and subject specializations have been officially recorded.
                    </p>

                    <div className="pt-3 border-t border-gray-100 flex flex-col space-y-2">
                        <button
                            className="w-full py-2 bg-[#4085b3] hover:bg-[#2b6a94] text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
                            onClick={() => router.push(`/dashboard/teachers/${successModal.teacherId}`)}
                        >
                            View Teacher Profile
                        </button>
                        <button
                            className="w-full py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-medium rounded-md transition-colors cursor-pointer"
                            onClick={() => router.push(`/dashboard/teachers/assignments`)}
                        >
                            Proceed to Staffing Allocations
                        </button>
                        <button
                            className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                            onClick={() => router.push("/dashboard/teachers")}
                        >
                            Return to Teachers Directory
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
