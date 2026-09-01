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
    HeartHandshake
} from "lucide-react";

function StudentsContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const sectionParam = searchParams.get("section");

    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [selectedSection, setSelectedSection] = useState(sectionParam || "ALL");
    const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
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

    // Filter section options
    const sections = useMemo(() => {
        return Array.from(
            new Set(
                students.map((s: any) => {
                    const gradeLevel = s.schoolGrade?.grade?.level || s.section?.schoolGrade?.grade?.level || '';
                    const secName = s.section?.name || '';
                    if (!gradeLevel && !secName) return '';
                    return `Grade ${gradeLevel} - ${secName}`.trim();
                }).filter(Boolean)
            )
        );
    }, [students]);

    // Computed Summary Metrics
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

    const filteredStudents = useMemo(() => {
        return students.filter((s: any) => {
            const st = s.student || s;
            const fullName = `${st.firstName || ''} ${st.lastName || ''} ${st.fatherName || ''}`.toLowerCase();
            const code = (st.studentId || '').toLowerCase();
            const q = search.toLowerCase();
            const matchesQuery = fullName.includes(q) || code.includes(q);

            const gradeLevel = s.schoolGrade?.grade?.level || s.section?.schoolGrade?.grade?.level || '';
            const secName = s.section?.name || '';
            const secLabel = `Grade ${gradeLevel} - ${secName}`.trim();
            const matchesSection = selectedSection === "ALL" || secLabel === selectedSection || secName === selectedSection;

            const hasFlags = (s.supportFlags || []).length > 0 || (s.attendanceRate ?? 100) < 80;
            let matchesStatus = true;
            if (selectedStatusFilter === "NEEDS_ATTENTION") {
                matchesStatus = hasFlags;
            } else if (selectedStatusFilter === "GOOD_STANDING") {
                matchesStatus = !hasFlags;
            }

            return matchesQuery && matchesSection && matchesStatus;
        });
    }, [students, search, selectedSection, selectedStatusFilter]);

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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
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
                        <div className="flex items-center space-x-2">
                            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Student Directory & Profiles</h1>
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full border border-blue-200">
                                Student Management
                            </span>
                        </div>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                            Manage assigned students, inspect profiles, track attendance, and analyze academic history.
                        </p>
                    </div>
                </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Total Assigned Students</p>
                            <h3 className="text-2xl font-black text-blue-950 mt-1">{metrics.total}</h3>
                            <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Enrolled across your sections</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
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

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                        type="text"
                        placeholder="Search student name or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                    {/* Section Filter */}
                    <div className="flex items-center space-x-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                        <Filter className="w-3.5 h-3.5 text-gray-500" />
                        <span className="font-semibold text-gray-600">Section:</span>
                        <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="bg-transparent font-bold text-gray-900 focus:outline-hidden cursor-pointer max-w-[150px] truncate"
                        >
                            <option value="ALL">All Sections</option>
                            {sections.map((sec: string) => (
                                <option key={sec} value={sec}>{sec}</option>
                            ))}
                        </select>
                    </div>

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

                    {(selectedSection !== "ALL" || selectedStatusFilter !== "ALL" || search) && (
                        <button
                            onClick={() => {
                                setSelectedSection("ALL");
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

            {/* Master Students Table Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 bg-gray-50/50">
                    <CardTitle className="flex items-center space-x-2 text-sm font-bold text-gray-900">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Assigned Section Students Master Table ({filteredStudents.length})</span>
                    </CardTitle>
                    <span className="text-xs font-semibold text-gray-500">
                        Sorted by Student Name & ID
                    </span>
                </CardHeader>

                <CardContent className="p-0">
                    {filteredStudents.length === 0 ? (
                        <div className="py-16 text-center text-gray-400 space-y-2">
                            <Inbox className="w-12 h-12 mx-auto text-gray-300" />
                            <p className="text-sm font-bold text-gray-700">No students match your search or filter</p>
                            <p className="text-xs text-gray-400">Try resetting your grade or status filters above.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-gray-50 text-gray-500 font-bold uppercase tracking-wider">
                                        <th className="py-3.5 px-4">#</th>
                                        <th className="py-3.5 px-4">Student Name</th>
                                        <th className="py-3.5 px-4">Student ID</th>
                                        <th className="py-3.5 px-4">Grade & Section</th>
                                        <th className="py-3.5 px-4">Gender</th>
                                        <th className="py-3.5 px-4 text-center">Status</th>
                                        <th className="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.map((item: any, idx: number) => {
                                        const st = item.student || item;
                                        const gradeLevel = item.schoolGrade?.grade?.level || item.section?.schoolGrade?.grade?.level || '';
                                        const secName = item.section?.name || '';
                                        const itemKey = `st-${st.id || item.id || idx}`;
                                        const hasFlags = (item.supportFlags || []).length > 0 || (item.attendanceRate ?? 100) < 80;

                                        return (
                                            <tr key={itemKey} className="hover:bg-gray-50/80 transition-colors group">
                                                <td className="py-3.5 px-4 font-bold text-gray-400">{idx + 1}</td>
                                                <td className="py-3.5 px-4">
                                                    <p className="font-extrabold text-gray-900">
                                                        {st.firstName} {st.lastName} {st.fatherName || ''}
                                                    </p>
                                                    {st.city && <p className="text-[10px] text-gray-400 font-medium">{st.city}, {st.woreda ? `Woreda ${st.woreda}` : 'Ethiopia'}</p>}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-gray-600">{st.studentId || "STU-001"}</td>
                                                <td className="py-3.5 px-4 font-semibold text-gray-700">
                                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-extrabold text-xs border border-blue-100">
                                                        Grade {gradeLevel}-{secName}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-gray-700 font-medium">{st.gender || "Unspecified"}</td>
                                                <td className="py-3.5 px-4 text-center">
                                                    {hasFlags ? (
                                                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold text-[10px] uppercase border border-amber-200 inline-flex items-center space-x-1">
                                                            <AlertCircle className="w-3 h-3" />
                                                            <span>At Risk</span>
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md font-bold text-[10px] uppercase border border-emerald-100 inline-flex items-center space-x-1">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span>Enrolled</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right relative">
                                                    <div className="inline-block text-left">
                                                        <button
                                                            onClick={() => setOpenMenuId(openMenuId === itemKey ? null : itemKey)}
                                                            className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 border border-transparent hover:border-gray-200"
                                                            title="Student Actions Menu"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>

                                                        {/* Floating 5-Action Dropdown Menu */}
                                                        {openMenuId === itemKey && (
                                                            <>
                                                                <div 
                                                                    className="fixed inset-0 z-20 cursor-default" 
                                                                    onClick={() => setOpenMenuId(null)} 
                                                                />

                                                                <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-30 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100 text-left">
                                                                    {/* Action 1: View Profile */}
                                                                    <button
                                                                        onClick={() => {
                                                                            handleViewStudentDetail(item, "profile");
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                    >
                                                                        <User className="w-4 h-4 text-blue-600" />
                                                                        <span>View Student Profile</span>
                                                                    </button>

                                                                    {/* Action 2: Student Attendance */}
                                                                    <button
                                                                        onClick={() => {
                                                                            handleViewStudentDetail(item, "attendance");
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                    >
                                                                        <Calendar className="w-4 h-4 text-purple-600" />
                                                                        <span>Attendance History</span>
                                                                    </button>

                                                                    {/* Action 3: Academic Performance */}
                                                                    <button
                                                                        onClick={() => {
                                                                            handleViewStudentDetail(item, "performance");
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                    >
                                                                        <Award className="w-4 h-4 text-emerald-600" />
                                                                        <span>Academic Performance</span>
                                                                    </button>

                                                                    {/* Action 4: Learning History */}
                                                                    <button
                                                                        onClick={() => {
                                                                            handleViewStudentDetail(item, "history");
                                                                            setOpenMenuId(null);
                                                                        }}
                                                                        className="w-full flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                    >
                                                                        <TrendingUp className="w-4 h-4 text-amber-600" />
                                                                        <span>Learning History</span>
                                                                    </button>

                                                                    {/* Action 5: Flag for Support */}
                                                                    <Link
                                                                        href={`/dashboard/teacher/support?studentId=${st.id || item.id}`}
                                                                        onClick={() => setOpenMenuId(null)}
                                                                        className="flex items-center space-x-2.5 px-3.5 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border-t border-gray-100 mt-1 pt-2"
                                                                    >
                                                                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                                                                        <span>Flag for Support</span>
                                                                    </Link>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tabbed Comprehensive Student Detail Modal / Drawer */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
                        
                        {/* Drawer Header */}
                        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                                    {(selectedStudent.student?.firstName || selectedStudent.firstName || 'S')[0]}
                                    {(selectedStudent.student?.lastName || selectedStudent.lastName || 'U')[0]}
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-gray-900 text-lg">
                                        {selectedStudent.student?.firstName || selectedStudent.firstName} {selectedStudent.student?.lastName || selectedStudent.lastName} {selectedStudent.student?.fatherName || selectedStudent.fatherName || ''}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium">
                                        ID: <span className="font-mono text-gray-700 font-bold">{selectedStudent.student?.studentId || selectedStudent.studentId || 'STU-001'}</span> • Grade {selectedStudent.schoolGrade?.grade?.level || selectedStudent.section?.schoolGrade?.grade?.level} - {selectedStudent.section?.name}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-gray-100 space-x-2 text-xs font-bold overflow-x-auto">
                            <button
                                onClick={() => setActiveTab("profile")}
                                className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                                    activeTab === "profile" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <User className="w-4 h-4" />
                                <span>1. Student Profile</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("attendance")}
                                className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                                    activeTab === "attendance" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <Calendar className="w-4 h-4" />
                                <span>2. Attendance ({presentRate}%)</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("performance")}
                                className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                                    activeTab === "performance" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <Award className="w-4 h-4" />
                                <span>3. Performance</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("history")}
                                className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
                                    activeTab === "history" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <TrendingUp className="w-4 h-4" />
                                <span>4. Learning History</span>
                            </button>
                        </div>

                        {/* Tab Content */}
                        {loadingDetail ? (
                            <div className="py-12 text-center text-gray-500 text-xs">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                Loading student records from database...
                            </div>
                        ) : (
                            <div className="space-y-4">
                                
                                {/* TAB 1: STUDENT PROFILE */}
                                {activeTab === "profile" && (
                                    <div className="space-y-4 text-xs">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Personal Details</p>
                                                <div>
                                                    <p className="text-gray-500">Full Name:</p>
                                                    <p className="font-bold text-gray-900">{selectedStudent.student?.firstName || selectedStudent.firstName} {selectedStudent.student?.lastName || selectedStudent.lastName} {selectedStudent.student?.fatherName || selectedStudent.fatherName || ''}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Gender:</p>
                                                    <p className="font-bold text-gray-900">{selectedStudent.student?.gender || selectedStudent.gender || "Not specified"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Date of Birth:</p>
                                                    <p className="font-bold text-gray-900">
                                                        {(selectedStudent.student?.dateOfBirth || selectedStudent.dateOfBirth) ? new Date(selectedStudent.student?.dateOfBirth || selectedStudent.dateOfBirth).toLocaleDateString() : "N/A"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Nationality:</p>
                                                    <p className="font-bold text-gray-900">{selectedStudent.student?.nationality || selectedStudent.nationality || "Ethiopian"}</p>
                                                </div>
                                            </div>

                                            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Emergency & Parent Contact</p>
                                                <div>
                                                    <p className="text-gray-500">Emergency Contact:</p>
                                                    <p className="font-bold text-gray-900">
                                                        {selectedStudent.student?.emergencyContactName || selectedStudent.emergencyContactName || "Guardian"} ({selectedStudent.student?.emergencyContactRelation || selectedStudent.emergencyContactRelation || "Parent"})
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Phone Number:</p>
                                                    <p className="font-bold text-blue-600 flex items-center space-x-1">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span>{selectedStudent.student?.emergencyContactPhone || selectedStudent.emergencyContactPhone || "+251 911 000 000"}</span>
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Residential Address:</p>
                                                    <p className="font-bold text-gray-900">
                                                        {selectedStudent.student?.city || selectedStudent.city || 'Addis Ababa'}, {(selectedStudent.student?.woreda || selectedStudent.woreda) ? `Woreda ${selectedStudent.student?.woreda || selectedStudent.woreda}` : ''}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Previous School:</p>
                                                    <p className="font-bold text-gray-900">{selectedStudent.student?.previousSchool || selectedStudent.previousSchool || "N/A"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: STUDENT ATTENDANCE */}
                                {activeTab === "attendance" && (
                                    <div className="space-y-4 text-xs">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                                <p className="text-emerald-700 font-bold text-[10px]">PRESENT</p>
                                                <p className="text-lg font-extrabold text-emerald-900">{presentAtt} ({presentRate}%)</p>
                                            </div>
                                            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                                                <p className="text-rose-700 font-bold text-[10px]">ABSENT</p>
                                                <p className="text-lg font-extrabold text-rose-900">{absentAtt}</p>
                                            </div>
                                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                                                <p className="text-amber-700 font-bold text-[10px]">LATE</p>
                                                <p className="text-lg font-extrabold text-amber-900">{lateAtt}</p>
                                            </div>
                                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                                <p className="text-blue-700 font-bold text-[10px]">EXCUSED</p>
                                                <p className="text-lg font-extrabold text-blue-900">{excusedAtt}</p>
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-gray-900 pt-2 flex items-center space-x-1.5">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            <span>Recent Attendance Records</span>
                                        </h4>

                                        {attendances.length === 0 ? (
                                            <p className="text-gray-400 italic">No attendance records logged for this student yet.</p>
                                        ) : (
                                            <div className="overflow-x-auto border border-gray-100 rounded-xl">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="bg-gray-50 text-gray-400 font-bold">
                                                        <tr>
                                                            <th className="py-2.5 px-3">Date</th>
                                                            <th className="py-2.5 px-3">Period</th>
                                                            <th className="py-2.5 px-3">Status</th>
                                                            <th className="py-2.5 px-3">Note</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100">
                                                        {attendances.map((att: any) => (
                                                            <tr key={att.id}>
                                                                <td className="py-2.5 px-3 font-semibold text-gray-800">
                                                                    {new Date(att.date).toLocaleDateString()}
                                                                </td>
                                                                <td className="py-2.5 px-3 text-gray-600">
                                                                    {att.classPeriod?.name || "Regular Period"}
                                                                </td>
                                                                <td className="py-2.5 px-3 font-bold">
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                                                                        att.status === "PRESENT" ? "bg-emerald-100 text-emerald-800" :
                                                                        att.status === "ABSENT" ? "bg-rose-100 text-rose-800" :
                                                                        att.status === "LATE" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                                                                    }`}>
                                                                        {att.status}
                                                                    </span>
                                                                </td>
                                                                <td className="py-2.5 px-3 text-gray-500 italic">{att.remarks || att.note || "No note"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 3: ACADEMIC PERFORMANCE */}
                                {activeTab === "performance" && (
                                    <div className="space-y-4 text-xs">
                                        <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-blue-600 font-bold text-[10px] uppercase">Average Assessment Score</p>
                                                <p className="text-xl font-black text-blue-950">{avgScore !== null ? `${avgScore}%` : 'N/A'}</p>
                                            </div>
                                            <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                                                <Award className="w-6 h-6" />
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-gray-900 pt-2 flex items-center space-x-1.5">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                            <span>Assessment & Evaluation History</span>
                                        </h4>

                                        {results.length === 0 ? (
                                            <p className="text-gray-400 italic">No score results recorded for this student yet.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {results.map((r: any) => {
                                                    const pct = Math.round((Number(r.score || 0) / Number(r.assessment?.maxScore || 100)) * 100);
                                                    return (
                                                        <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                            <div>
                                                                <p className="font-bold text-gray-900">{r.assessment?.title || "Class Assessment"}</p>
                                                                <p className="text-[10px] text-gray-400 font-medium">{r.assessment?.type || 'Quiz / Exam'} • Max Points: {r.assessment?.maxScore || 100}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-black text-blue-600 text-sm">{r.score} / {r.assessment?.maxScore || 100}</p>
                                                                <p className="text-[10px] font-bold text-gray-500">{pct}% Grade</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 4: LEARNING HISTORY & SUPPORT */}
                                {activeTab === "history" && (
                                    <div className="space-y-4 text-xs">
                                        <div>
                                            <h4 className="font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                                                <ShieldAlert className="w-4 h-4 text-amber-600" />
                                                <span>Support Flags & Remedial History</span>
                                            </h4>
                                            {!studentDetail?.supportFlags || studentDetail.supportFlags.length === 0 ? (
                                                <p className="text-gray-400 italic">No academic or behavioral support flags raised.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {studentDetail.supportFlags.map((flag: any) => (
                                                        <div key={flag.id} className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-900">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-bold text-xs">{flag.reason}</span>
                                                                <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded font-bold text-[10px]">
                                                                    {flag.severity} Severity
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] mt-1 text-amber-800">{flag.description || "Active intervention flag"}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                                                <BookOpen className="w-4 h-4 text-blue-600" />
                                                <span>Activity Submissions</span>
                                            </h4>
                                            {!studentDetail?.submissions || studentDetail.submissions.length === 0 ? (
                                                <p className="text-gray-400 italic">No activity submissions logged.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {studentDetail.submissions.map((sub: any) => (
                                                        <div key={sub.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                                            <div>
                                                                <p className="font-bold text-gray-900">{sub.activity?.title || "Class Activity"}</p>
                                                                <p className="text-[10px] text-gray-400">Submitted: {new Date(sub.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                                                Submitted
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function StudentsPage() {
    return (
        <Suspense fallback={
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm font-semibold text-gray-600 font-sans">Loading student directory...</p>
            </div>
        }>
            <StudentsContent />
        </Suspense>
    );
}
