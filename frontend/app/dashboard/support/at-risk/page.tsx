"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    AlertTriangle, 
    Search, 
    Sparkles, 
    CheckCircle2, 
    Users, 
    FileText,
    BookOpen,
    Filter
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AtRiskStudentsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [riskFilter, setRiskFilter] = useState("ALL");

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/assessment/at-risk/students");
            if (res.ok) {
                const data = await res.json();
                setStudents(Array.isArray(data) ? data : []);
            } else {
                setStudents([]);
            }
        } catch (err: any) {
            console.error(err);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const filteredStudents = students.filter(s => {
        const matchesQuery = !searchQuery.trim() ||
            s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.studentIdCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.gradeName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesQuery;
    });

    if (loading) return <LoadingState message="Scanning at-risk students based on academic & attendance thresholds..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-amber-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-amber-700" />
                        SRS Domain 9.1: At-Risk Student Risk Detector
                    </span>
                    <p className="text-amber-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & Guidance Counselors.
                        <br />
                        <strong>Data Source:</strong> Computed from database tables `StudentEnrollment`, `AssessmentResult` (&lt;50%), and `StudentAttendance` (&gt;3 unexcused).
                        <br />
                        <strong>SRS Purpose:</strong> Early detection of vulnerable students before end-of-term exams to trigger immediate intervention plans.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <AlertTriangle className="w-7 h-7 text-amber-600" />
                        <span>1. At-Risk Student Directory</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Real-time identification of students with academic deficiencies or attendance risk flags.</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-amber-50/60 border-amber-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Identified At-Risk</p>
                            <p className="text-xl font-bold text-amber-900">{students.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-red-50/60 border-red-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-red-100 text-red-600 rounded-lg">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Academic Deficiencies</p>
                            <p className="text-xl font-bold text-red-800">{students.filter(s => s.failingSubjects?.length > 0).length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50/60 border-purple-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Parent Contacted</p>
                            <p className="text-xl font-bold text-purple-900">0</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50/60 border-emerald-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Resolved Cases</p>
                            <p className="text-xl font-bold text-emerald-900">0</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Student Directory */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
                        At-Risk Student Registry
                    </CardTitle>
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search student or grade..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filteredStudents.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
                            <p className="font-semibold text-gray-800">No students currently flagged at-risk</p>
                            <p className="text-xs text-gray-400 mt-1">Students scoring below passing threshold in assessments will automatically appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Student Name & ID</th>
                                        <th className="px-6 py-3.5 font-semibold">Grade & Section</th>
                                        <th className="px-6 py-3.5 font-semibold">Risk Flags</th>
                                        <th className="px-6 py-3.5 font-semibold">Average Score</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Intervention</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                <p>{item.studentName}</p>
                                                <p className="text-xs font-mono font-normal text-gray-500">{item.studentIdCode}</p>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-gray-700">
                                                {item.gradeName} — <span className="text-[#006b3f]">{item.sectionName}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <div className="flex flex-wrap gap-1">
                                                    {item.failingSubjects?.map((sub: string, i: number) => (
                                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
                                                            {sub}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-red-700 text-xs">
                                                {item.gpaAverage}% Avg
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button size="sm" variant="outline">Create Plan</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
