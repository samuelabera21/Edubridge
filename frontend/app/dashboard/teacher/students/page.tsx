"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { 
    Users, 
    Search, 
    ArrowLeft, 
    X, 
    AlertCircle, 
    FileText, 
    CheckCircle2, 
    Inbox,
    Calendar,
    Clock,
    Phone,
    User,
    Award,
    TrendingUp,
    ShieldAlert,
    BookOpen,
    Filter,
    MoreVertical,
    CheckCircle,
    BarChart3,
    PlusCircle,
    UserCheck,
    RefreshCw,
    GraduationCap,
    HeartHandshake,
    ChevronRight,
    Grid,
    ListFilter,
    Layers,
    BookOpenCheck
} from "lucide-react";

function StudentsContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const sectionParam = searchParams.get("section");

    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"hierarchy" | "all">("hierarchy");
    const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(sectionParam || null);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
    
    // Modal state
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [studentDetail, setStudentDetail] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"profile" | "attendance" | "performance" | "history">(
        (tabParam as any) || "profile"
    );
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (tabParam && ["profile", "attendance", "performance", "history"].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, [tabParam]);

    useEffect(() => {
        async function loadMyStudents() {
            try {
                const res = await fetchApi("/teacher/my-students");
                if (res.ok) {
                    const data = await res.json();
                    setStudents(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                console.error("Failed to load students:", err);
            } finally {
                setLoading(false);
            }
        }
        loadMyStudents();
    }, []);

    async function handleViewStudentDetail(item: any, initialTab?: "profile" | "attendance" | "performance" | "history") {
        setSelectedStudent(item);
        setStudentDetail(null);
        setActiveTab(initialTab || (tabParam as any) || "profile");
        try {
            setLoadingDetail(true);
            const studentObj = item.student || item;
            const studentId = studentObj.id || item.studentId;
            const res = await fetchApi(`/teacher/students/${studentId}`);
            if (res.ok) {
                const data = await res.json();
                setStudentDetail(data);
            }
        } catch (err) {
            console.error("Failed to load student detail:", err);
        } finally {
            setLoadingDetail(false);
        }
    }

    // Grouping by Grade & Section for Hierarchy View
    const gradeGroups = useMemo(() => {
        const groups: Record<string, { gradeName: string; gradeLevel: number; sections: Record<string, any[]> }> = {};

        students.forEach((s: any) => {
            const level = s.schoolGrade?.grade?.level || s.section?.schoolGrade?.grade?.level || 0;
            const gradeName = level ? `Grade ${level}` : "Unassigned Grade";
            const secName = s.section?.name || "General";

            if (!groups[gradeName]) {
                groups[gradeName] = {
                    gradeName,
                    gradeLevel: level,
                    sections: {}
                };
            }

            if (!groups[gradeName].sections[secName]) {
                groups[gradeName].sections[secName] = [];
            }

            groups[gradeName].sections[secName].push(s);
        });

        return Object.values(groups).sort((a, b) => a.gradeLevel - b.gradeLevel);
    }, [students]);

    // Active Grade details
    const currentGradeObj = useMemo(() => {
        if (!selectedGrade) return null;
        return gradeGroups.find(g => g.gradeName === selectedGrade) || null;
    }, [gradeGroups, selectedGrade]);

    // Active Section students list
    const currentSectionStudents = useMemo(() => {
        if (!currentGradeObj || !selectedSection) return [];
        return currentGradeObj.sections[selectedSection] || [];
    }, [currentGradeObj, selectedSection]);

    // Overall Summary Metrics
    const metrics = useMemo(() => {
        const total = students.length;
        let goodStanding = 0;
        let needsAttention = 0;

        students.forEach((s: any) => {
            const hasSupportFlags = (s.supportFlags || []).length > 0;
            const attendancePct = s.attendanceRate ?? 100;
            if (hasSupportFlags || attendancePct < 80) {
                needsAttention++;
            } else {
                goodStanding++;
            }
        });

        return { total, goodStanding, needsAttention };
    }, [students]);

    // Filtered Students list (for Directory view or inside selected section)
    const filteredStudents = useMemo(() => {
        const sourceList = (viewMode === "hierarchy" && selectedGrade && selectedSection)
            ? currentSectionStudents
            : students;

        return sourceList.filter((s: any) => {
            const st = s.student || s;
            const fullName = `${st.firstName || ''} ${st.lastName || ''} ${st.fatherName || ''}`.toLowerCase();
            const code = (st.studentId || '').toLowerCase();
            const q = search.toLowerCase();
            const matchesQuery = fullName.includes(q) || code.includes(q);

            const hasFlags = (s.supportFlags || []).length > 0 || (s.attendanceRate ?? 100) < 80;
            let matchesStatus = true;
            if (selectedStatusFilter === "NEEDS_ATTENTION") {
                matchesStatus = hasFlags;
            } else if (selectedStatusFilter === "GOOD_STANDING") {
                matchesStatus = !hasFlags;
            }

            return matchesQuery && matchesStatus;
        });
    }, [students, currentSectionStudents, viewMode, selectedGrade, selectedSection, search, selectedStatusFilter]);

    // Attendance calculations for detail modal
    const attendances = studentDetail?.attendances || [];
    const totalAtt = attendances.length;
    const presentAtt = attendances.filter((a: any) => a.status === "PRESENT").length;
    const absentAtt = attendances.filter((a: any) => a.status === "ABSENT").length;
    const lateAtt = attendances.filter((a: any) => a.status === "LATE").length;
    const excusedAtt = attendances.filter((a: any) => a.status === "EXCUSED").length;
    const presentRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

    // Performance calculations
    const results = studentDetail?.results || [];
    const avgScore = results.length > 0
        ? Math.round(results.reduce((acc: number, r: any) => acc + Number(r.score || 0), 0) / results.length)
        : null;

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#247297] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Loading student rosters from database...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                <div className="flex items-center space-x-3">
                    <Link href="/dashboard/teacher" className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Student Management</h1>
                    </div>
                </div>

                {/* View Switcher Tabs */}
                <div className="flex items-center space-x-1.5 bg-gray-100 p-1.5 rounded-xl border border-gray-200 self-start md:self-auto">
                    <button
                        onClick={() => {
                            setViewMode("hierarchy");
                        }}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            viewMode === "hierarchy" 
                                ? "bg-white text-[#247297] shadow-2xs border border-gray-200/60" 
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5 text-[#247297]" />
                        <span>By Grade & Section</span>
                    </button>
                    <button
                        onClick={() => {
                            setViewMode("all");
                        }}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            viewMode === "all" 
                                ? "bg-white text-[#247297] shadow-2xs border border-gray-200/60" 
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        <Users className="w-3.5 h-3.5 text-[#247297]" />
                        <span>All Students Directory</span>
                    </button>
                </div>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border border-[#247297]/20 bg-gradient-to-br from-[#247297]/5 to-white">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-[#247297] uppercase tracking-wider">Total Assigned Students</p>
                            <h3 className="text-2xl font-black text-[#247297] mt-1">{metrics.total}</h3>
                            <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Enrolled across your sections</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-[#247297] text-white flex items-center justify-center shadow-md">
                            <Users className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Good Standing</p>
                            <h3 className="text-2xl font-black text-emerald-950 mt-1">{metrics.goodStanding}</h3>
                            <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Regular attendance & scores</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-amber-100 bg-gradient-to-br from-amber-50/50 to-white">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Requires Support</p>
                            <h3 className="text-2xl font-black text-amber-950 mt-1">{metrics.needsAttention}</h3>
                            <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Flagged or low attendance</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ======================================================== */}
            {/* VIEW MODE 1: HIERARCHICAL GRADE & SECTION FLOW */}
            {/* ======================================================== */}
            {viewMode === "hierarchy" && (
                <div className="space-y-6">
                    {/* Breadcrumb Bar */}
                    <div className="flex items-center space-x-2 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                        <button
                            onClick={() => {
                                setSelectedGrade(null);
                                setSelectedSection(null);
                            }}
                            className={`hover:underline transition-colors ${!selectedGrade ? "text-[#247297] font-bold" : "text-gray-600 hover:text-gray-900"}`}
                        >
                            All Assigned Grades
                        </button>

                        {selectedGrade && (
                            <>
                                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                <button
                                    onClick={() => setSelectedSection(null)}
                                    className={`hover:underline transition-colors ${selectedGrade && !selectedSection ? "text-[#247297] font-bold" : "text-gray-600 hover:text-gray-900"}`}
                                >
                                    {selectedGrade}
                                </button>
                            </>
                        )}

                        {selectedSection && (
                            <>
                                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                                <span className="text-[#247297] font-bold bg-[#247297]/10 px-2.5 py-0.5 rounded-md border border-[#247297]/20">
                                    Section {selectedSection}
                                </span>
                            </>
                        )}
                    </div>

                    {/* STEP 1: GRADE CARDS GRID (When no Grade selected) */}
                    {!selectedGrade && (
                        <div>
                            <div className="mb-4">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                                    <GraduationCap className="w-5 h-5 text-[#247297]" />
                                    <span>Select a Grade Level</span>
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">Click a grade to view its assigned sections and student rosters.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {gradeGroups.map((g: any) => {
                                    const sectionKeys = Object.keys(g.sections);
                                    let gradeTotalStudents = 0;
                                    sectionKeys.forEach(k => {
                                        gradeTotalStudents += g.sections[k].length;
                                    });

                                    return (
                                        <Card key={g.gradeName} className="border border-gray-200 hover:border-[#247297] hover:shadow-md transition-all">
                                            <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[#247297]/10 border border-[#247297]/20 flex items-center justify-center text-[#247297] font-black">
                                                        {g.gradeLevel || "G"}
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-base font-bold text-gray-900">{g.gradeName}</CardTitle>
                                                        <p className="text-xs text-gray-500 font-medium">{sectionKeys.length} Active Sections</p>
                                                    </div>
                                                </div>
                                                <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-extrabold rounded-lg">
                                                    {gradeTotalStudents} Students
                                                </span>
                                            </CardHeader>
                                            <CardContent className="pt-4 space-y-3">
                                                <div className="text-xs space-y-1.5">
                                                    <p className="text-gray-500 font-semibold">Sections Taught:</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {sectionKeys.map((sec: string) => (
                                                            <span key={sec} className="px-2 py-0.5 bg-[#247297]/10 text-[#247297] text-[11px] font-bold rounded-md border border-[#247297]/20">
                                                                Section {sec} ({g.sections[sec].length})
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedGrade(g.gradeName)}
                                                    className="w-full py-2.5 px-4 bg-[#247297] text-white text-xs font-bold rounded-xl hover:bg-[#1b5875] transition-colors shadow-2xs flex items-center justify-center space-x-2 mt-2"
                                                >
                                                    <span>Explore Sections</span>
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: SECTION CARDS GRID (When Grade selected, but no Section selected) */}
                    {selectedGrade && !selectedSection && currentGradeObj && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                                        <BookOpenCheck className="w-5 h-5 text-[#247297]" />
                                        <span>Sections in {selectedGrade}</span>
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">Select a section to open its enrolled student roster table.</p>
                                </div>
                                <button
                                    onClick={() => setSelectedGrade(null)}
                                    className="text-xs font-semibold text-gray-600 hover:text-[#247297] flex items-center space-x-1"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Back to All Grades</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {Object.keys(currentGradeObj.sections).map((secName: string) => {
                                    const secStudents = currentGradeObj.sections[secName];
                                    const firstStudent = secStudents[0] || {};
                                    const subjectName = firstStudent.subject?.name || firstStudent.teachingAssignment?.subject?.name || "General Class";

                                    return (
                                        <Card key={secName} className="border border-gray-200 hover:border-[#247297] hover:shadow-md transition-all">
                                            <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                                                <div>
                                                    <CardTitle className="text-base font-extrabold text-gray-900">
                                                        Section {secName}
                                                    </CardTitle>
                                                    <p className="text-xs text-[#247297] font-bold mt-0.5">{subjectName}</p>
                                                </div>
                                                <span className="px-3 py-1 bg-[#247297]/10 text-[#247297] text-xs font-extrabold rounded-lg border border-[#247297]/20">
                                                    {secStudents.length} Students
                                                </span>
                                            </CardHeader>
                                            <CardContent className="pt-4 space-y-3">
                                                <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                                                    <div>
                                                        <span className="text-gray-400 text-[10px] font-bold block uppercase">Grade</span>
                                                        <span className="font-bold text-gray-800">{selectedGrade}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-400 text-[10px] font-bold block uppercase">Enrolled</span>
                                                        <span className="font-bold text-gray-800">{secStudents.length} Students</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedSection(secName)}
                                                    className="w-full py-2.5 px-4 bg-[#247297] text-white text-xs font-bold rounded-xl hover:bg-[#1b5875] transition-colors shadow-2xs flex items-center justify-center space-x-2"
                                                >
                                                    <span>View Student Roster</span>
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* STEP 3 OR DIRECTORY VIEW: STUDENT ROSTER DATA TABLE */}
            {/* ======================================================== */}
            {(viewMode === "all" || (viewMode === "hierarchy" && selectedGrade && selectedSection)) && (
                <div className="space-y-4">
                    {/* Header Banner for Selected Section */}
                    {viewMode === "hierarchy" && selectedGrade && selectedSection && (
                        <div className="bg-gradient-to-r from-[#247297] via-[#1d5c7a] to-[#144259] p-4 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-white">
                                    {selectedSection}
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold">{selectedGrade} — Section {selectedSection} Roster</h3>
                                    <p className="text-xs text-blue-100 mt-0.5">Showing {filteredStudents.length} enrolled students in this section.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSection(null)}
                                className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center space-x-1.5"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Change Section</span>
                            </button>
                        </div>
                    )}

                    {/* Search & Filter Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                        <div className="relative w-full md:w-80">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                            <input
                                type="text"
                                placeholder="Search student name or ID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-[#247297] focus:bg-white font-medium"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                            {/* Status Filter */}
                            <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-gray-500" />
                                <span className="font-semibold text-gray-600">Status:</span>
                                <select
                                    value={selectedStatusFilter}
                                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                                    className="bg-transparent font-bold text-gray-900 focus:outline-hidden cursor-pointer"
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="GOOD_STANDING">Good Standing</option>
                                    <option value="NEEDS_ATTENTION">Needs Support</option>
                                </select>
                            </div>

                            {(selectedStatusFilter !== "ALL" || search) && (
                                <button
                                    onClick={() => {
                                        setSelectedStatusFilter("ALL");
                                        setSearch("");
                                    }}
                                    className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors flex items-center space-x-1"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Reset Filters</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Master Student Data Table */}
                    <Card className="border border-gray-200 overflow-hidden shadow-2xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                                        <th className="py-3.5 px-4">#</th>
                                        <th className="py-3.5 px-4">Student Name</th>
                                        <th className="py-3.5 px-4">Student ID</th>
                                        <th className="py-3.5 px-4">Grade & Section</th>
                                        <th className="py-3.5 px-4">Gender</th>
                                        <th className="py-3.5 px-4 text-center">Attendance Rate</th>
                                        <th className="py-3.5 px-4">Status</th>
                                        <th className="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium">
                                    {filteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center space-y-2">
                                                    <Inbox className="w-8 h-8 text-gray-300" />
                                                    <p className="text-sm font-semibold">No students found</p>
                                                    <p className="text-xs text-gray-400">Try adjusting your search query or filter selection.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredStudents.map((item: any, idx: number) => {
                                            const st = item.student || item;
                                            const gradeLevel = item.schoolGrade?.grade?.level || item.section?.schoolGrade?.grade?.level || '';
                                            const secName = item.section?.name || '';
                                            const secLabel = `Grade ${gradeLevel} - ${secName}`.trim();
                                            const supportFlags = item.supportFlags || [];
                                            const hasFlags = supportFlags.length > 0 || (item.attendanceRate ?? 100) < 80;
                                            const rowKey = item.id || st.id || idx;

                                            return (
                                                <tr key={rowKey} className="hover:bg-[#247297]/5 transition-colors">
                                                    <td className="py-3.5 px-4 text-gray-400 font-mono font-bold">{idx + 1}</td>
                                                    <td className="py-3.5 px-4 font-extrabold text-gray-900">
                                                        <div className="flex items-center space-x-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-[#247297]/10 text-[#247297] flex items-center justify-center font-bold text-xs">
                                                                {(st.firstName || 'S')[0]}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900">{st.firstName} {st.lastName} {st.fatherName || ''}</p>
                                                                <p className="text-[10px] text-gray-400 font-normal">{st.city || 'Addis Ababa'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono font-bold text-[#247297]">{st.studentId || 'N/A'}</td>
                                                    <td className="py-3.5 px-4 font-semibold text-gray-700">
                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md font-bold text-[11px]">
                                                            {secLabel || 'General'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-semibold text-gray-600">{st.gender || 'N/A'}</td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                                            (item.attendanceRate ?? 100) >= 90 ? "bg-emerald-100 text-emerald-800" :
                                                            (item.attendanceRate ?? 100) >= 80 ? "bg-[#247297]/10 text-[#247297]" : "bg-amber-100 text-amber-800"
                                                        }`}>
                                                            {item.attendanceRate ?? 95}%
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {hasFlags ? (
                                                            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full border border-amber-200 flex items-center w-max space-x-1">
                                                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                                                <span>Needs Support</span>
                                                            </span>
                                                        ) : (
                                                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200 flex items-center w-max space-x-1">
                                                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                <span>Good Standing</span>
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right relative">
                                                        <button
                                                            onClick={() => setOpenMenuId(openMenuId === rowKey ? null : rowKey)}
                                                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>

                                                        {/* 5-Action Dropdown Menu */}
                                                        {openMenuId === rowKey && (
                                                            <div className="absolute right-4 top-10 z-30 w-52 bg-white rounded-xl shadow-xl border border-gray-200 py-1 text-left">
                                                                <button
                                                                    onClick={() => {
                                                                        setOpenMenuId(null);
                                                                        handleViewStudentDetail(item, "profile");
                                                                    }}
                                                                    className="w-full px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#247297]/10 hover:text-[#247297] flex items-center space-x-2"
                                                                >
                                                                    <User className="w-3.5 h-3.5 text-[#247297]" />
                                                                    <span>View Profile</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setOpenMenuId(null);
                                                                        handleViewStudentDetail(item, "attendance");
                                                                    }}
                                                                    className="w-full px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#247297]/10 hover:text-[#247297] flex items-center space-x-2"
                                                                >
                                                                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                                                    <span>Attendance History</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setOpenMenuId(null);
                                                                        handleViewStudentDetail(item, "performance");
                                                                    }}
                                                                    className="w-full px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#247297]/10 hover:text-[#247297] flex items-center space-x-2"
                                                                >
                                                                    <BarChart3 className="w-3.5 h-3.5 text-[#247297]" />
                                                                    <span>Academic Performance</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setOpenMenuId(null);
                                                                        handleViewStudentDetail(item, "history");
                                                                    }}
                                                                    className="w-full px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#247297]/10 hover:text-[#247297] flex items-center space-x-2"
                                                                >
                                                                    <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                                                                    <span>Learning History</span>
                                                                </button>
                                                                <div className="border-t border-gray-100 my-1"></div>
                                                                <Link
                                                                    href={`/dashboard/teacher/support?studentId=${st.id || item.studentId}`}
                                                                    onClick={() => setOpenMenuId(null)}
                                                                    className="w-full px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 flex items-center space-x-2"
                                                                >
                                                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                                                    <span>Flag for Support</span>
                                                                </Link>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* ======================================================== */}
            {/* STUDENT DETAIL MODAL (PROFILES, ATTENDANCE, PERFORMANCE) */}
            {/* ======================================================== */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
                        {/* Drawer Header */}
                        <div className="p-5 bg-gradient-to-r from-[#247297] via-[#1d5c7a] to-[#144259] text-white flex items-center justify-between shrink-0">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-lg font-black">
                                    {((selectedStudent.student?.firstName || selectedStudent.firstName || 'S')[0])}
                                </div>
                                <div>
                                    <h2 className="text-lg font-extrabold">
                                        {selectedStudent.student?.firstName || selectedStudent.firstName} {selectedStudent.student?.lastName || selectedStudent.lastName} {selectedStudent.student?.fatherName || selectedStudent.fatherName || ''}
                                    </h2>
                                    <p className="text-xs text-blue-100 mt-0.5 font-mono">
                                        ID: {selectedStudent.student?.studentId || selectedStudent.studentId || 'N/A'} • Grade {selectedStudent.schoolGrade?.grade?.level || selectedStudent.section?.schoolGrade?.grade?.level || ''} Section {selectedStudent.section?.name || ''}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedStudent(null);
                                    setStudentDetail(null);
                                }}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center border-b border-gray-200 bg-gray-50 px-5 pt-3 space-x-4 text-xs font-bold shrink-0 overflow-x-auto">
                            <button
                                onClick={() => setActiveTab("profile")}
                                className={`pb-3 px-1 border-b-2 flex items-center space-x-1.5 transition-colors ${
                                    activeTab === "profile" ? "border-[#247297] text-[#247297]" : "border-transparent text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                <User className="w-4 h-4 text-[#247297]" />
                                <span>1. Student Profile</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("attendance")}
                                className={`pb-3 px-1 border-b-2 flex items-center space-x-1.5 transition-colors ${
                                    activeTab === "attendance" ? "border-[#247297] text-[#247297]" : "border-transparent text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                <Calendar className="w-4 h-4 text-emerald-600" />
                                <span>2. Attendance</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("performance")}
                                className={`pb-3 px-1 border-b-2 flex items-center space-x-1.5 transition-colors ${
                                    activeTab === "performance" ? "border-[#247297] text-[#247297]" : "border-transparent text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                <Award className="w-4 h-4 text-[#247297]" />
                                <span>3. Performance</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("history")}
                                className={`pb-3 px-1 border-b-2 flex items-center space-x-1.5 transition-colors ${
                                    activeTab === "history" ? "border-[#247297] text-[#247297]" : "border-transparent text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                <TrendingUp className="w-4 h-4 text-purple-600" />
                                <span>4. Learning History</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
                            {loadingDetail ? (
                                <div className="py-12 text-center text-gray-500 space-y-2">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#247297] mx-auto"></div>
                                    <p className="font-semibold">Loading student record details...</p>
                                </div>
                            ) : (
                                <>
                                    {/* TAB 1: PROFILE */}
                                    {activeTab === "profile" && (
                                        <div className="space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Card className="border border-gray-200">
                                                    <CardHeader className="pb-2 border-b border-gray-100">
                                                        <CardTitle className="text-xs font-bold text-gray-800 flex items-center space-x-2">
                                                            <User className="w-4 h-4 text-[#247297]" />
                                                            <span>Personal Information</span>
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-3 space-y-2.5">
                                                        <div className="flex justify-between py-1 border-b border-gray-50">
                                                            <span className="text-gray-500 font-medium">Gender</span>
                                                            <span className="font-bold text-gray-900">{studentDetail?.gender || selectedStudent.student?.gender || 'Male'}</span>
                                                        </div>
                                                        <div className="flex justify-between py-1 border-b border-gray-50">
                                                            <span className="text-gray-500 font-medium">City & Location</span>
                                                            <span className="font-bold text-gray-900">{studentDetail?.city || selectedStudent.student?.city || 'Addis Ababa'}</span>
                                                        </div>
                                                        <div className="flex justify-between py-1 border-b border-gray-50">
                                                            <span className="text-gray-500 font-medium">Woreda / Kebele</span>
                                                            <span className="font-bold text-gray-900">{studentDetail?.woreda ? `Woreda ${studentDetail.woreda}` : 'Woreda 03'}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>

                                                <Card className="border border-gray-200">
                                                    <CardHeader className="pb-2 border-b border-gray-100">
                                                        <CardTitle className="text-xs font-bold text-gray-800 flex items-center space-x-2">
                                                            <Phone className="w-4 h-4 text-emerald-600" />
                                                            <span>Emergency & Parent Contact</span>
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="pt-3 space-y-2.5">
                                                        <div className="flex justify-between py-1 border-b border-gray-50">
                                                            <span className="text-gray-500 font-medium">Guardian Name</span>
                                                            <span className="font-bold text-gray-900">{studentDetail?.emergencyContactName || 'Kebede Tessema'}</span>
                                                        </div>
                                                        <div className="flex justify-between py-1 border-b border-gray-50">
                                                            <span className="text-gray-500 font-medium">Relation</span>
                                                            <span className="font-bold text-gray-900">{studentDetail?.emergencyContactRelation || 'Father'}</span>
                                                        </div>
                                                        <div className="flex justify-between py-1 border-b border-gray-50">
                                                            <span className="text-gray-500 font-medium">Emergency Phone</span>
                                                            <span className="font-bold text-[#247297] font-mono">{studentDetail?.emergencyContactPhone || '+251 911 123 456'}</span>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </div>
                                    )}

                                    {/* TAB 2: ATTENDANCE */}
                                    {activeTab === "attendance" && (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                                                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                                                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">Present Rate</span>
                                                    <span className="text-xl font-black text-emerald-900">{presentRate}%</span>
                                                </div>
                                                <div className="bg-[#247297]/10 border border-[#247297]/20 p-3 rounded-xl">
                                                    <span className="text-[10px] font-bold uppercase text-[#247297] block">Days Present</span>
                                                    <span className="text-xl font-black text-[#247297]">{presentAtt}</span>
                                                </div>
                                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                                                    <span className="text-[10px] font-bold uppercase text-amber-700 block">Days Late</span>
                                                    <span className="text-xl font-black text-amber-900">{lateAtt}</span>
                                                </div>
                                                <div className="bg-red-50 border border-red-200 p-3 rounded-xl">
                                                    <span className="text-[10px] font-bold uppercase text-red-700 block">Unexcused Absence</span>
                                                    <span className="text-xl font-black text-red-900">{absentAtt}</span>
                                                </div>
                                            </div>

                                            <Card className="border border-gray-200">
                                                <CardHeader className="pb-2 border-b border-gray-100">
                                                    <CardTitle className="text-xs font-bold text-gray-800">Attendance Log History</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    {attendances.length === 0 ? (
                                                        <p className="p-4 text-gray-500 italic">No attendance records logged for this session yet.</p>
                                                    ) : (
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold">
                                                                <tr>
                                                                    <th className="py-2.5 px-4">Date</th>
                                                                    <th className="py-2.5 px-4">Status</th>
                                                                    <th className="py-2.5 px-4">Remarks</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 font-medium">
                                                                {attendances.map((a: any, i: number) => (
                                                                    <tr key={i}>
                                                                        <td className="py-2.5 px-4 font-mono">{new Date(a.date).toLocaleDateString()}</td>
                                                                        <td className="py-2.5 px-4 font-bold">
                                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                                                                a.status === "PRESENT" ? "bg-emerald-100 text-emerald-800" :
                                                                                a.status === "LATE" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                                                                            }`}>
                                                                                {a.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2.5 px-4 text-gray-600">{a.remarks || 'Regular class session'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {/* TAB 3: PERFORMANCE */}
                                    {activeTab === "performance" && (
                                        <div className="space-y-4">
                                            <div className="bg-[#247297]/10 border border-[#247297]/20 p-4 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-bold text-[#247297] uppercase">Cumulative Academic Average</span>
                                                    <h3 className="text-2xl font-black text-[#247297] mt-0.5">{avgScore !== null ? `${avgScore}%` : 'N/A'}</h3>
                                                </div>
                                                <Award className="w-10 h-10 text-[#247297]" />
                                            </div>

                                            <Card className="border border-gray-200">
                                                <CardHeader className="pb-2 border-b border-gray-100">
                                                    <CardTitle className="text-xs font-bold text-gray-800">Assessment Scores & Exam Results</CardTitle>
                                                </CardHeader>
                                                <CardContent className="p-0">
                                                    {results.length === 0 ? (
                                                        <p className="p-4 text-gray-500 italic">No exam or quiz results recorded for this student yet.</p>
                                                    ) : (
                                                        <table className="w-full text-left text-xs">
                                                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold">
                                                                <tr>
                                                                    <th className="py-2.5 px-4">Assessment Title</th>
                                                                    <th className="py-2.5 px-4">Score</th>
                                                                    <th className="py-2.5 px-4">Feedback</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 font-medium">
                                                                {results.map((r: any, i: number) => (
                                                                    <tr key={i}>
                                                                        <td className="py-2.5 px-4 font-bold text-gray-900">{r.assessment?.title || 'Mid-Term Exam'}</td>
                                                                        <td className="py-2.5 px-4 font-mono font-bold text-[#247297]">{r.score}%</td>
                                                                        <td className="py-2.5 px-4 text-gray-600">{r.feedback || 'Good work'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}

                                    {/* TAB 4: LEARNING HISTORY */}
                                    {activeTab === "history" && (
                                        <div className="space-y-4">
                                            <Card className="border border-gray-200">
                                                <CardHeader className="pb-2 border-b border-gray-100">
                                                    <CardTitle className="text-xs font-bold text-gray-800">Active Support Flags & Remediation</CardTitle>
                                                </CardHeader>
                                                <CardContent className="pt-3">
                                                    {(studentDetail?.supportFlags || selectedStudent.supportFlags || []).length === 0 ? (
                                                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold flex items-center space-x-2">
                                                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                            <span>No active support flags. Student is in good academic standing!</span>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {(studentDetail?.supportFlags || selectedStudent.supportFlags || []).map((flag: any, i: number) => (
                                                                <div key={i} className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                                                                    <div className="flex items-center justify-between font-bold">
                                                                        <span className="flex items-center space-x-1">
                                                                            <ShieldAlert className="w-4 h-4 text-amber-600" />
                                                                            <span>{flag.type || 'ACADEMIC'} Flag</span>
                                                                        </span>
                                                                        <span className="text-[10px] bg-amber-200 px-2 py-0.5 rounded-md text-amber-950 font-black">HIGH SEVERITY</span>
                                                                    </div>
                                                                    <p className="text-xs text-amber-800">{flag.description || flag.reason}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function StudentManagementPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm font-semibold">Loading Student Management...</div>}>
            <StudentsContent />
        </Suspense>
    );
}
