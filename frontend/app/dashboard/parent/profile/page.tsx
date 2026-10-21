"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { 
    User, 
    GraduationCap, 
    Building2, 
    Calendar, 
    ShieldCheck, 
    MapPin, 
    Phone, 
    Mail, 
    School, 
    CheckCircle2, 
    AlertCircle, 
    Users, 
    BookOpen, 
    Clock, 
    FileText,
    IdCard,
    Sparkles,
    UserCheck,
    Lock
} from "lucide-react";

function ChildProfileContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams.get("tab") || "general";

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);

    useEffect(() => {
        async function loadProfile() {
            try {
                setLoading(true);
                const res = await fetchApi("/parent/me");
                if (!res.ok) {
                    throw new Error("Failed to load parent profile data");
                }
                const data = await res.json();
                setProfile(data);
            } catch (err: any) {
                console.error("Child profile fetch error:", err);
                setError(err.message || "Failed to load child profile.");
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, []);

    const setTab = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (tab === "general") {
            params.delete("tab");
        } else {
            params.set("tab", tab);
        }
        router.push(`/dashboard/parent/profile?${params.toString()}`);
    };

    if (loading) {
        return (
            <div className="w-full max-w-5xl mx-auto space-y-6 animate-pulse">
                <div className="h-28 bg-gray-200 rounded-2xl" />
                <div className="h-12 bg-gray-100 rounded-xl w-72" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-64 bg-gray-100 rounded-2xl" />
                    <div className="h-64 bg-gray-100 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="w-full max-w-5xl mx-auto p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 shrink-0 text-red-600" />
                <div>
                    <h3 className="font-bold text-sm">Unable to load child profile</h3>
                    <p className="text-xs text-red-600 mt-0.5">{error || "Please verify your parent account connection."}</p>
                </div>
            </div>
        );
    }

    const children = profile?.children || [];
    const hasChildren = children.length > 0;
    const currentChildRelation = hasChildren ? children[selectedChildIndex] : null;
    const student = currentChildRelation?.student;

    if (!student) {
        return (
            <div className="w-full max-w-5xl mx-auto p-8 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-center space-y-3">
                <Users className="w-12 h-12 mx-auto text-amber-600 opacity-60" />
                <h3 className="font-bold text-base">No Linked Student Found</h3>
                <p className="text-xs text-amber-700 max-w-md mx-auto">
                    There is currently no student linked to your account. Please contact the school administration to link your student profile.
                </p>
            </div>
        );
    }

    const enrollments = student.enrollments || [];
    const activeEnrollment = enrollments[0] || null;
    const organization = activeEnrollment?.organization;
    const schoolGrade = activeEnrollment?.schoolGrade;
    const section = activeEnrollment?.section;
    const academicYear = activeEnrollment?.academicYear;

    const studentFullName = [student.firstName, student.lastName, student.fatherName]
        .filter(Boolean)
        .join(" ") || `${student.firstName} ${student.lastName}`;

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {/* Header Panel - Clean White Background */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#184973] font-bold text-2xl shadow-xs">
                            {student.firstName?.[0] || "S"}
                            {student.lastName?.[0] || ""}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                                    {currentChildRelation?.relationship || "Guardian"} View
                                </span>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Link
                                </span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5 text-gray-900">
                                {studentFullName}
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center gap-2">
                                <span>ID: <strong className="text-gray-900 font-mono">{student.studentId}</strong></span>
                                <span>•</span>
                                <span>{schoolGrade?.grade?.name || "Grade"} - Section {section?.name || "A"}</span>
                                <span>•</span>
                                <span>{organization?.name || "Bolo Giorgis Secondary School"}</span>
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-xs space-y-1">
                        <div className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider">Parent / Guardian:</div>
                        <div className="font-bold text-gray-900 text-sm">
                            {profile.firstName} {profile.lastName}
                        </div>
                        <div className="text-gray-600 text-[11px]">
                            {profile.email || profile.phoneNumber || "Verified Parent"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Child Switcher (if parent has multiple children) */}
            {children.length > 1 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Select Child:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {children.map((rel: any, idx: number) => {
                            const isSelected = idx === selectedChildIndex;
                            const ch = rel.student;
                            return (
                                <button
                                    key={ch.id || idx}
                                    onClick={() => setSelectedChildIndex(idx)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                        isSelected
                                            ? "bg-[#184973] text-white shadow-sm"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                                        {ch.firstName?.[0] || "S"}
                                    </div>
                                    <span>{ch.firstName} {ch.lastName}</span>
                                    <span className="text-[10px] opacity-75 font-mono">({ch.studentId})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}


            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setTab("general")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === "general"
                            ? "bg-[#184973] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                    <User className="w-4 h-4" />
                    <span>General Information</span>
                </button>

                <button
                    onClick={() => setTab("enrollment")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === "enrollment"
                            ? "bg-[#184973] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                    <School className="w-4 h-4" />
                    <span>Academic Enrollment</span>
                </button>
            </div>

            {/* TAB 1: GENERAL INFORMATION */}
            {currentTab === "general" && (
                <div className="space-y-6">
                    {/* Official Notice */}
                    <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
                        <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Official Ministry & Institutional Record</span>
                            <p className="text-blue-700 mt-0.5 leading-relaxed">
                                Your child's legal identity information is verified and maintained by the school registrar. Any updates to names, birth records, or official registration require direct contact with the school administration with supporting documentation.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Student Core Identity Card */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <IdCard className="w-4 h-4 text-[#184973]" />
                                    <span>Personal Information</span>
                                </h3>
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                                    Verified
                                </span>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Full Name:</span>
                                    <span className="font-semibold text-gray-900 text-right">{studentFullName}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Student ID:</span>
                                    <span className="font-mono font-bold text-blue-700 text-right">{student.studentId}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Gender:</span>
                                    <span className="font-semibold text-gray-900 capitalize text-right">
                                        {student.gender ? (student.gender === "MALE" || student.gender === "M" ? "Male" : "Female") : "Not specified"}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Date of Birth:</span>
                                    <span className="font-semibold text-gray-900 text-right">
                                        {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Nationality:</span>
                                    <span className="font-semibold text-gray-900 text-right">{student.nationality || "Ethiopian"}</span>
                                </div>
                                <div className="flex justify-between py-1.5">
                                    <span className="text-gray-500">Place of Birth:</span>
                                    <span className="font-semibold text-gray-900 text-right">{student.placeOfBirth || "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Verified Relationship & Guardian Rights */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <UserCheck className="w-4 h-4 text-emerald-700" />
                                    <span>Guardian Rights & Linkage</span>
                                </h3>
                                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                                    Active Guardian
                                </span>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Relationship:</span>
                                    <span className="font-bold text-blue-900 text-right">{currentChildRelation?.relationship || "Guardian"}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Primary Guardian:</span>
                                    <span className="font-semibold text-gray-900 text-right">
                                        {currentChildRelation?.isPrimary ? (
                                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5 inline" /> Yes (Primary Contact)
                                            </span>
                                        ) : "Secondary Contact"}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Pickup Permission:</span>
                                    <span className="font-semibold text-gray-900 text-right">
                                        {currentChildRelation?.canPickup ? (
                                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5 inline" /> Authorized
                                            </span>
                                        ) : (
                                            <span className="text-gray-500">Not authorized</span>
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Emergency Contact:</span>
                                    <span className="font-semibold text-gray-900 text-right">
                                        {student.emergencyContactName ? (
                                            <span className="text-gray-800 font-medium">
                                                {student.emergencyContactName} {student.emergencyContactPhone ? `(${student.emergencyContactPhone})` : ""}
                                            </span>
                                        ) : "None on file"}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1.5">
                                    <span className="text-gray-500">Linked Since:</span>
                                    <span className="font-semibold text-gray-900 text-right">
                                        {currentChildRelation?.createdAt ? new Date(currentChildRelation.createdAt).toLocaleDateString() : "Active"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Address & Residence Card */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-[#184973]" />
                                    <span>Residential Address</span>
                                </h3>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Region:</span>
                                    <span className="font-semibold text-gray-900 text-right">{student.region || "Amhara"}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Zone:</span>
                                    <span className="font-semibold text-gray-900 text-right">{student.zone || "North Shewa"}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Woreda:</span>
                                    <span className="font-semibold text-gray-900 text-right">{student.woreda || "Minjar Shenkora"}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">City / Kebele:</span>
                                    <span className="font-semibold text-gray-900 text-right">
                                        {[student.city, student.kebele].filter(Boolean).join(" - ") || "Bolo"}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1.5">
                                    <span className="text-gray-500">House No.:</span>
                                    <span className="font-semibold text-gray-900 text-right">{student.houseNumber || "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Prior Academic History Card */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[#184973]" />
                                    <span>Prior Academic Records</span>
                                </h3>
                            </div>

                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Previous School:</span>
                                    <span className="font-semibold text-gray-900 text-right">{student.previousSchool || "Bolo Primary School"}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Previous Student ID:</span>
                                    <span className="font-mono text-gray-900 text-right">{student.previousStudentId || "N/A"}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-gray-50">
                                    <span className="text-gray-500">Enrollment Classification:</span>
                                    <span className="font-semibold text-emerald-700 text-right">
                                        {activeEnrollment?.enrollmentType || "REGULAR"}
                                    </span>
                                </div>
                                <div className="flex justify-between py-1.5">
                                    <span className="text-gray-500">Official Verification:</span>
                                    <span className="font-semibold text-gray-900 text-right">Transcripts on file</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: ACADEMIC ENROLLMENT */}
            {currentTab === "enrollment" && (
                <div className="space-y-6">
                    {/* Active Enrollment Banner Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                            <div>
                                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                    ● Current Active Placement
                                </span>
                                <h3 className="text-lg font-bold text-gray-900 mt-2">
                                    {organization?.name || "Bolo Giorgis Secondary School"}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Academic enrollment details for {academicYear?.name || "2026/2018 E.C."}
                                </p>
                            </div>
                            <div className="text-left sm:text-right">
                                <span className="text-xs text-gray-400 block">Enrollment Status</span>
                                <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 inline-block mt-1">
                                    {activeEnrollment?.status || "ENROLLED"}
                                </span>
                            </div>
                        </div>

                        {/* Core Placement Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1">
                                <span className="text-gray-500 text-[11px] font-medium block">Grade Level</span>
                                <p className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                                    <BookOpen className="w-4 h-4 text-[#184973]" />
                                    <span>{schoolGrade?.grade?.name || "Grade 10"}</span>
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-100 space-y-1">
                                <span className="text-gray-500 text-[11px] font-medium block">Section</span>
                                <p className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4 text-violet-600" />
                                    <span>Section {section?.name || "A"}</span>
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-100 space-y-1">
                                <span className="text-gray-500 text-[11px] font-medium block">Academic Year</span>
                                <p className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-amber-600" />
                                    <span>{academicYear?.name || "2026 (2018 E.C.)"}</span>
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                                <span className="text-gray-500 text-[11px] font-medium block">Enrolled Date</span>
                                <p className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-slate-600" />
                                    <span>
                                        {activeEnrollment?.enrollmentDate ? new Date(activeEnrollment.enrollmentDate).toLocaleDateString() : "September 2026"}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* School Contact & Campus Details */}
                        <div className="border border-gray-100 rounded-2xl p-5 bg-slate-50/80 space-y-3">
                            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <School className="w-4 h-4 text-[#184973]" />
                                <span>School & Campus Contact Information</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-700">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                    <span>{organization?.name || "Bolo Giorgis Secondary School"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                    <span>{organization?.schoolProfile?.contactEmail || "contact@bologiorgis.edu.et"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                                    <span>{organization?.schoolProfile?.phoneNumber || "+251 11 000 0000"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Historical Enrollment Records */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#184973]" />
                                <span>Enrollment History</span>
                            </h3>
                            <span className="text-xs text-gray-500 font-medium">{enrollments.length} record(s)</span>
                        </div>

                        {enrollments.length === 0 ? (
                            <p className="text-xs text-gray-400 py-4 text-center">No enrollment history records found.</p>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {enrollments.map((enr: any, idx: number) => (
                                    <div key={enr.id || idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                        <div className="space-y-0.5">
                                            <p className="font-bold text-gray-900">
                                                {enr.organization?.name || organization?.name || "Bolo Giorgis Secondary School"}
                                            </p>
                                            <p className="text-gray-500">
                                                {enr.schoolGrade?.grade?.name || "Grade"} • Section {enr.section?.name || "A"} • Year: {enr.academicYear?.name || "Current"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-500 font-mono text-[11px]">
                                                {enr.enrollmentDate ? new Date(enr.enrollmentDate).toLocaleDateString() : ""}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                idx === 0 ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"
                                            }`}>
                                                {idx === 0 ? "Current" : "Archived"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ChildProfilePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="text-gray-500 text-xs font-medium animate-pulse">
                    Loading child profile...
                </div>
            </div>
        }>
            <ChildProfileContent />
        </Suspense>
    );
}
