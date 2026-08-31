"use client";

import { useEffect, useState, Suspense } from "react";
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
    Filter
} from "lucide-react";

function StudentsContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");

    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [selectedSection, setSelectedSection] = useState("ALL");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [studentDetail, setStudentDetail] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"profile" | "attendance" | "performance" | "history">(
        (tabParam as any) || "profile"
    );
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

    async function handleViewStudentDetail(student: any, initialTab?: "profile" | "attendance" | "performance" | "history") {
        setSelectedStudent(student);
        setStudentDetail(null);
        setActiveTab(initialTab || (tabParam as any) || "profile");
        try {
            setLoadingDetail(true);
            const studentId = student.studentId || student.student?.id;
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
    const sections = Array.from(
        new Set(
            students.map((s: any) => {
                const gradeName = s.schoolGrade?.grade?.level ? `Grade ${s.schoolGrade.grade.level}` : '';
                const secName = s.section?.name || '';
                return `${gradeName} - ${secName}`.trim();
            }).filter(Boolean)
        )
    );

    const filteredStudents = students.filter((s: any) => {
        const st = s.student || s;
        const fullName = `${st.firstName || ''} ${st.lastName || ''} ${st.fatherName || ''}`.toLowerCase();
        const code = (st.studentId || '').toLowerCase();
        const q = search.toLowerCase();
        const matchesQuery = fullName.includes(q) || code.includes(q);

        const gradeName = s.schoolGrade?.grade?.level ? `Grade ${s.schoolGrade.grade.level}` : '';
        const secName = s.section?.name || '';
        const secLabel = `${gradeName} - ${secName}`.trim();
        const matchesSection = selectedSection === "ALL" || secLabel === selectedSection;

        return matchesQuery && matchesSection;
    });

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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Loading student rosters...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <Link href="/dashboard/teacher" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Student Directory & Performance</h1>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                            Manage assigned students, inspect profiles, track attendance, and analyze academic history.
                        </p>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-48">
                        <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-xs rounded-xl pl-8 pr-4 py-2.5 shadow-2xs outline-none focus:ring-2 focus:ring-[#4085b3] font-medium text-gray-700 appearance-none cursor-pointer"
                        >
                            <option value="ALL">All Sections</option>
                            {sections.map((sec: string) => (
                                <option key={sec} value={sec}>{sec}</option>
                            ))}
                        </select>
                        <Filter className="w-4 h-4 text-gray-400 absolute left-2.5 top-3 pointer-events-none" />
                    </div>

                    <div className="relative w-full sm:w-64">
                        <input
                            type="text"
                            placeholder="Search student name or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-xs rounded-xl pl-9 pr-4 py-2.5 shadow-2xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    </div>
                </div>
            </div>

            {/* Students Table Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                        <Users className="w-5 h-5 text-[#4085b3]" />
                        <span>Assigned Section Students</span>
                    </CardTitle>
                    <span className="text-xs font-bold text-gray-500">
                        {filteredStudents.length} Student(s) Listed
                    </span>
                </CardHeader>

                <CardContent>
                    {filteredStudents.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 space-y-2">
                            <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                            <p className="text-sm font-semibold text-gray-600">No students found</p>
                            <p className="text-xs text-gray-400">Try adjusting your search terms or section filter.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                                        <th className="py-3 px-3">Student Name</th>
                                        <th className="py-3 px-3">Student ID</th>
                                        <th className="py-3 px-3">Class / Section</th>
                                        <th className="py-3 px-3">Gender</th>
                                        <th className="py-3 px-3">Status</th>
                                        <th className="py-3 px-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredStudents.map((item: any) => {
                                        const st = item.student || item;
                                        const gradeName = item.schoolGrade?.grade?.level ? `Grade ${item.schoolGrade.grade.level}` : '';
                                        const secName = item.section?.name || '';
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="py-3.5 px-3">
                                                    <p className="font-bold text-gray-900">
                                                        {st.firstName} {st.lastName} {st.fatherName || ''}
                                                    </p>
                                                    {st.city && <p className="text-[10px] text-gray-400">{st.city}, {st.woreda || 'Ethiopia'}</p>}
                                                </td>
                                                <td className="py-3.5 px-3 font-mono font-semibold text-gray-600">{st.studentId || "N/A"}</td>
                                                <td className="py-3.5 px-3 font-semibold text-gray-700">
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md font-bold text-[11px]">
                                                        {gradeName} - {secName}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3 text-gray-600 font-medium">{st.gender || "Unspecified"}</td>
                                                <td className="py-3.5 px-3">
                                                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                                        Enrolled
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleViewStudentDetail(item, "profile")}
                                                            className="px-3 py-1.5 bg-[#4085b3] hover:bg-[#356e94] text-white rounded-lg font-bold text-[11px] transition-colors shadow-2xs flex items-center space-x-1"
                                                            title="View Student Profile"
                                                        >
                                                            <User className="w-3.5 h-3.5" />
                                                            <span>Profile</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleViewStudentDetail(item, "performance")}
                                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-bold text-[11px] transition-colors shadow-2xs flex items-center space-x-1"
                                                            title="View Student Performance & Grades"
                                                        >
                                                            <Award className="w-3.5 h-3.5 text-amber-400" />
                                                            <span>Performance</span>
                                                        </button>
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

            {/* Tabbed Comprehensive Student Detail Drawer */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
                        
                        {/* Drawer Header */}
                        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-[#4085b3] flex items-center justify-center font-bold text-lg">
                                    {selectedStudent.student?.firstName?.[0]}{selectedStudent.student?.lastName?.[0]}
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-gray-900 text-lg">
                                        {selectedStudent.student?.firstName} {selectedStudent.student?.lastName} {selectedStudent.student?.fatherName || ''}
                                    </h3>
                                    <p className="text-xs text-gray-500 font-medium">
                                        ID: <span className="font-mono text-gray-700 font-bold">{selectedStudent.student?.studentId}</span> • Grade {selectedStudent.schoolGrade?.grade?.level} - {selectedStudent.section?.name}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-gray-100 space-x-2 text-xs font-bold">
                            <button
                                onClick={() => setActiveTab("profile")}
                                className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
                                    activeTab === "profile" ? "border-[#4085b3] text-[#4085b3]" : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <User className="w-4 h-4" />
                                <span>1. Student Profile</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("attendance")}
                                className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
                                    activeTab === "attendance" ? "border-[#4085b3] text-[#4085b3]" : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <Calendar className="w-4 h-4" />
                                <span>2. Attendance ({presentRate}%)</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("performance")}
                                className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
                                    activeTab === "performance" ? "border-[#4085b3] text-[#4085b3]" : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <Award className="w-4 h-4" />
                                <span>3. Performance</span>
                            </button>
                            <button
                                onClick={() => setActiveTab("history")}
                                className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center space-x-1.5 ${
                                    activeTab === "history" ? "border-[#4085b3] text-[#4085b3]" : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <TrendingUp className="w-4 h-4" />
                                <span>4. Learning History</span>
                            </button>
                        </div>

                        {/* Tab Content */}
                        {loadingDetail ? (
                            <div className="py-12 text-center text-gray-500 text-xs">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4085b3] mx-auto mb-2"></div>
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
                                                    <p className="font-bold text-gray-900">{selectedStudent.student?.firstName} {selectedStudent.student?.lastName} {selectedStudent.student?.fatherName || ''}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Gender:</p>
                                                    <p className="font-bold text-gray-900">{selectedStudent.student?.gender || "Not specified"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Date of Birth:</p>
                                                    <p className="font-bold text-gray-900">
                                                        {selectedStudent.student?.dateOfBirth ? new Date(selectedStudent.student.dateOfBirth).toLocaleDateString() : "N/A"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Nationality:</p>
                                                    <p className="font-bold text-gray-900">{selectedStudent.student?.nationality || "Ethiopian"}</p>
                                                </div>
                                            </div>

                                            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Emergency & Parent Contact</p>
                                                <div>
                                                    <p className="text-gray-500">Emergency Contact:</p>
                                                    <p className="font-bold text-gray-900">
                                                        {selectedStudent.student?.emergencyContactName || "Guardian"} ({selectedStudent.student?.emergencyContactRelation || "Parent"})
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Phone Number:</p>
                                                    <p className="font-bold text-[#4085b3] flex items-center space-x-1">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span>{selectedStudent.student?.emergencyContactPhone || "+251 911 000 000"}</span>
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Residential Address:</p>
                                                    <p className="font-bold text-gray-900">
                                                        {selectedStudent.student?.city || 'Addis Ababa'}, {selectedStudent.student?.woreda ? `Woreda ${selectedStudent.student.woreda}` : ''}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500">Previous School:</p>
                                                    <p className="font-bold text-gray-900">{selectedStudent.student?.previousSchool || "N/A"}</p>
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
                                            <Clock className="w-4 h-4 text-[#4085b3]" />
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
                                                <p className="text-[#4085b3] font-bold text-[10px] uppercase">Average Assessment Score</p>
                                                <p className="text-xl font-black text-blue-950">{avgScore !== null ? `${avgScore}%` : 'N/A'}</p>
                                            </div>
                                            <div className="p-2.5 bg-[#4085b3] text-white rounded-xl">
                                                <Award className="w-6 h-6" />
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-gray-900 pt-2 flex items-center space-x-1.5">
                                            <FileText className="w-4 h-4 text-[#4085b3]" />
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
                                                                <p className="font-black text-[#4085b3] text-sm">{r.score} / {r.assessment?.maxScore || 100}</p>
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
                                                <BookOpen className="w-4 h-4 text-[#4085b3]" />
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600 font-sans">Loading student directory...</p>
            </div>
        }>
            <StudentsContent />
        </Suspense>
    );
}
