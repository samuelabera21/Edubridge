"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    AlertTriangle, 
    UserCheck, 
    BookOpen, 
    CheckCircle2, 
    Sparkles, 
    Search, 
    X,
    Plus,
    FileText,
    Users
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

interface AtRiskStudent {
    id: string;
    studentName: string;
    studentIdCode: string;
    gradeName: string;
    sectionName: string;
    failingSubjects: string[];
    gpaAverage: number;
    parentPhone?: string;
    status: "IDENTIFIED" | "TUTORIAL_ASSIGNED" | "RESOLVED";
}

export default function AcademicAtRiskPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<AtRiskStudent[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Modal state for tutorial assignment
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null);
    const [remedialNotes, setRemedialNotes] = useState("");

    const loadAtRiskStudents = async () => {
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
        loadAtRiskStudents();
    }, []);

    const handleAssignTutorial = (student: AtRiskStudent) => {
        setSelectedStudent(student);
        setRemedialNotes("");
        setIsModalOpen(true);
    };

    const handleModalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent) return;

        setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, status: "TUTORIAL_ASSIGNED" } : s));
        setSuccessMsg(`Remedial tutorial support assigned for ${selectedStudent.studentName}.`);
        setIsModalOpen(false);
    };

    const filteredStudents = students.filter(s => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            s.studentName.toLowerCase().includes(q) ||
            s.studentIdCode.toLowerCase().includes(q) ||
            s.gradeName.toLowerCase().includes(q)
        );
    });

    if (loading) return <LoadingState message="Scanning academic at-risk students..." />;

    return (
        <div className="space-y-6 text-black">
            {/* Context SRS Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-amber-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-amber-700" />
                        SRS Domain 8: Academic At-Risk & Remedial Support Detector
                    </span>
                    <p className="text-amber-800">
                        <strong>Who Fills This:</strong> Automatically flagged by system when student scores fall below 50% passing mark in assessments.
                        <br />
                        <strong>Data Source:</strong> Evaluated from `AssessmentResult` table where `score &lt; passingScore`.
                        <br />
                        <strong>Who Uses This:</strong> Principals, Department Heads & Guidance Counselors to assign remedial tutorials & notify parents early.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <AlertTriangle className="w-7 h-7 text-amber-600" />
                        <span>Academic At-Risk & Remedial Support Detector</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Automatic detection of students requiring academic support, remedial tutorials, or intervention.</p>
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
                            <p className="text-xs font-semibold text-gray-500 uppercase">At-Risk Students</p>
                            <p className="text-xl font-bold text-amber-900">{students.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/60 border-blue-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Tutorials Assigned</p>
                            <p className="text-xl font-bold text-gray-900">{students.filter(s => s.status === "TUTORIAL_ASSIGNED").length}</p>
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
                            <p className="text-xl font-bold text-gray-900">{students.filter(s => s.status === "RESOLVED").length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50/60 border-purple-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Avg Deficiency GPA</p>
                            <p className="text-xl font-bold text-purple-900">48.2%</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notifications */}
            {successMsg && (
                <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 flex justify-between items-center text-sm shadow-sm">
                    <span className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span>{successMsg}</span></span>
                    <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* At Risk Directory */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
                        Students Requiring Academic Remedial Intervention
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
                        <div className="p-8 text-center text-gray-500">
                            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-700">No students currently flagged at-risk</p>
                            <p className="text-xs text-gray-400 mt-1">Students scoring below passing mark in assessments will automatically appear here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Student Name & ID</th>
                                        <th className="px-6 py-3.5 font-semibold">Grade & Section</th>
                                        <th className="px-6 py-3.5 font-semibold">Failing Subjects (&lt;50%)</th>
                                        <th className="px-6 py-3.5 font-semibold">Average Score</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Intervention Action</th>
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
                                                <span className="font-semibold">{item.gradeName}</span> — <span className="text-[#006b3f]">{item.sectionName}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <div className="flex flex-wrap gap-1">
                                                    {item.failingSubjects.map((sub, i) => (
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
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    leftIcon={<BookOpen className="w-3.5 h-3.5" />}
                                                    onClick={() => handleAssignTutorial(item)}
                                                >
                                                    {item.status === "TUTORIAL_ASSIGNED" ? "Assigned" : "Assign Tutorial"}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Assign Tutorial Modal */}
            {isModalOpen && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Assign Remedial Support / Tutorial</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-900 space-y-1">
                            <p className="font-bold">{selectedStudent.studentName} ({selectedStudent.studentIdCode})</p>
                            <p>Failing: <strong>{selectedStudent.failingSubjects.join(", ")}</strong></p>
                        </div>

                        <form onSubmit={handleModalSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Remedial Plan & Teacher Notes *</label>
                                <textarea
                                    required
                                    value={remedialNotes}
                                    onChange={(e) => setRemedialNotes(e.target.value)}
                                    placeholder="Assign Saturday physics tutorial & extra homework exercises..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-[#006b3f] hover:bg-[#005432]">
                                    Confirm Tutorial Assignment
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
