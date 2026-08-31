"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Users, Search, ArrowLeft, X, AlertCircle, FileText, CheckCircle2, Inbox } from "lucide-react";

export default function StudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [studentDetail, setStudentDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [loading, setLoading] = useState(true);

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

    async function handleViewStudentDetail(student: any) {
        setSelectedStudent(student);
        setStudentDetail(null);
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

    const filteredStudents = students.filter((s: any) => {
        const fullName = `${s.student?.firstName || ''} ${s.student?.lastName || ''}`.toLowerCase();
        const code = (s.student?.studentId || '').toLowerCase();
        const q = search.toLowerCase();
        return fullName.includes(q) || code.includes(q);
    });

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
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
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Enrolled Student Directory</h1>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                            Search and inspect student profiles, historical attendance, and evaluation records.
                        </p>
                    </div>
                </div>

                {/* Search input */}
                <div className="relative w-full md:w-72">
                    <input
                        type="text"
                        placeholder="Search student name or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white border border-gray-200 text-xs rounded-xl pl-9 pr-4 py-2.5 shadow-2xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                        <Users className="w-5 h-5 text-blue-600" />
                        <span>Assigned Section Students</span>
                    </CardTitle>
                    <span className="text-xs font-bold text-gray-500">
                        {filteredStudents.length} Student(s) Found
                    </span>
                </CardHeader>

                <CardContent>
                    {filteredStudents.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 space-y-2">
                            <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                            <p className="text-sm font-semibold text-gray-600">No students match your query</p>
                            <p className="text-xs text-gray-400">Try adjusting your search terms or verify your section assignments.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                                        <th className="py-3 px-3">Student Name</th>
                                        <th className="py-3 px-3">Student ID</th>
                                        <th className="py-3 px-3">Grade & Section</th>
                                        <th className="py-3 px-3">Gender</th>
                                        <th className="py-3 px-3">Status</th>
                                        <th className="py-3 px-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredStudents.map((item: any) => {
                                        const st = item.student || item;
                                        const gradeName = item.schoolGrade?.grade?.level ? `Grade ${item.schoolGrade.grade.level}` : '';
                                        const secName = item.section?.name || '';
                                        return (
                                            <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="py-3.5 px-3 font-bold text-gray-900">
                                                    {st.firstName} {st.lastName} {st.fatherName || ''}
                                                </td>
                                                <td className="py-3.5 px-3 font-mono text-gray-500">{st.studentId || "N/A"}</td>
                                                <td className="py-3.5 px-3 font-semibold text-gray-700">{gradeName}{secName}</td>
                                                <td className="py-3.5 px-3 text-gray-500">{st.gender || "Unspecified"}</td>
                                                <td className="py-3.5 px-3">
                                                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                                        Active
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-3 text-right">
                                                    <button
                                                        onClick={() => handleViewStudentDetail(item)}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] transition-colors shadow-2xs"
                                                    >
                                                        View Profile
                                                    </button>
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

            {/* Student Profile Detail Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="font-bold text-gray-900 text-base">Student Academic Profile</h3>
                                <p className="text-xs text-gray-500">{selectedStudent.student?.firstName} {selectedStudent.student?.lastName}</p>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="py-8 text-center text-gray-500 text-xs">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                Fetching student attendance and assessment records...
                            </div>
                        ) : (
                            <div className="space-y-4 text-xs">
                                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase text-[10px]">Student ID</p>
                                        <p className="font-bold text-gray-800">{selectedStudent.student?.studentId || "N/A"}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase text-[10px]">Section</p>
                                        <p className="font-bold text-gray-800">Grade {selectedStudent.schoolGrade?.grade?.level}{selectedStudent.section?.name}</p>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                        <span>Assessment Score History</span>
                                    </h4>
                                    {!studentDetail?.results || studentDetail.results.length === 0 ? (
                                        <p className="text-gray-400 italic">No score results recorded for this student yet.</p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {studentDetail.results.map((r: any) => (
                                                <div key={r.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                                    <div>
                                                        <p className="font-bold text-gray-800">{r.assessment?.title || "Assessment"}</p>
                                                        <p className="text-[10px] text-gray-400">{r.assessment?.type}</p>
                                                    </div>
                                                    <span className="font-black text-blue-700">{r.score} / {r.assessment?.maxScore || 100}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
