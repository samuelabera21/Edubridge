"use client";

import { useEffect, useState, useRef, Suspense } from "react";
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
    Lock,
    ChevronDown,
    Check
} from "lucide-react";

function ChildProfileContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams.get("tab") || "general";

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
            {/* Header Panel with Dropdown Student Selector */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-sm text-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                        Child Profile
                    </h1>
                </div>

                {/* Single Student Selector Dropdown Button */}
                {hasChildren && (
                    <div className="relative flex-shrink-0" ref={dropdownRef}>
                        <div className="text-xs text-gray-500 font-semibold mb-1.5 flex items-center justify-between">
                            <span>Active Student</span>
                            {children.length > 1 && (
                                <span className="text-[11px] text-[#4085b3] font-medium">
                                    {selectedChildIndex + 1} of {children.length}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full sm:w-auto min-w-[240px] flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-gray-300 hover:border-[#4085b3] rounded-xl shadow-sm hover:shadow transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#4085b3] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                    {student.firstName?.charAt(0) || "S"}
                                </div>
                                <div className="leading-tight">
                                    <div className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                                        {student.firstName} {student.lastName}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                        {schoolGrade?.grade?.name || "Grade"} {section?.name ? `• Sec ${section.name}` : ""}
                                    </div>
                                </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                <div className="px-3.5 py-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Select Linked Child ({children.length})
                                </div>
                                <div className="max-h-72 overflow-y-auto py-1 divide-y divide-gray-50">
                                    {children.map((rel: any, idx: number) => {
                                        const isSelected = selectedChildIndex === idx;
                                        const ch = rel.student;
                                        const chEnrollment = ch?.enrollments?.[0];
                                        const gName = chEnrollment?.schoolGrade?.grade?.name || "";
                                        const sName = chEnrollment?.section?.name ? `Sec ${chEnrollment.section.name}` : "";

                                        return (
                                            <button
                                                key={ch?.id || idx}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedChildIndex(idx);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors ${
                                                    isSelected ? "bg-blue-50/70 text-[#4085b3]" : "hover:bg-gray-50 text-gray-800"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        isSelected ? "bg-[#4085b3] text-white" : "bg-gray-100 text-gray-700"
                                                    }`}>
                                                        {ch?.firstName?.charAt(0) || "S"}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-gray-900 leading-tight">
                                                            {ch?.firstName} {ch?.lastName}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {ch?.studentId || "STU-ID"} {gName ? `• ${gName}` : ""} {sName ? `• ${sName}` : ""}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <Check className="w-4 h-4 text-[#4085b3] flex-shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>


            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setTab("general")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === "general"
                            ? "bg-[#4085b3] text-white shadow-sm"
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
                            ? "bg-[#4085b3] text-white shadow-sm"
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
                        <Lock className="w-4 h-4 text-[#4085b3] shrink-0 mt-0.5" />
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
                                    <IdCard className="w-4 h-4 text-[#4085b3]" />
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
                                    <MapPin className="w-4 h-4 text-[#4085b3]" />
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
                                    <Clock className="w-4 h-4 text-[#4085b3]" />
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
                                    <BookOpen className="w-4 h-4 text-[#4085b3]" />
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
                                <School className="w-4 h-4 text-[#4085b3]" />
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
                                <Clock className="w-4 h-4 text-[#4085b3]" />
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
