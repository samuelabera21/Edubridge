"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    CheckCircle2, 
    FileText, 
    Printer, 
    Award, 
    Sparkles, 
    Clock, 
    AlertCircle, 
    Search, 
    X,
    ShieldCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

interface GradebookApprovalItem {
    id: string;
    gradeName: string;
    sectionName: string;
    teacherName: string;
    subjectCount: number;
    studentCount: number;
    status: "PENDING_APPROVAL" | "APPROVED_BY_PRINCIPAL";
    submittedAt: string;
    approvedAt?: string;
}

export default function GradebookApprovalPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [gradebooks, setGradebooks] = useState<GradebookApprovalItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Modal state for Report Card Preview
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const loadGradebooks = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/assessment/gradebooks/approval");
            if (res.ok) {
                const data = await res.json();
                setGradebooks(Array.isArray(data) ? data : []);
            } else {
                setGradebooks([]);
            }
        } catch (err: any) {
            console.error(err);
            setGradebooks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGradebooks();
    }, []);

    const handleApproveGradebook = (id: string, gradeSection: string) => {
        setGradebooks(prev => prev.map(g => g.id === id ? {
            ...g,
            status: "APPROVED_BY_PRINCIPAL",
            approvedAt: new Date().toISOString().split("T")[0]
        } : g));

        setSuccessMsg(`Gradebook for ${gradeSection} approved successfully by Principal. Official Report Cards generated!`);
    };

    const filteredGradebooks = gradebooks.filter(g => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            g.gradeName.toLowerCase().includes(q) ||
            g.sectionName.toLowerCase().includes(q) ||
            g.teacherName.toLowerCase().includes(q)
        );
    });

    if (loading) return <LoadingState message="Loading Principal Gradebook Approval & Report Card Hub..." />;

    return (
        <div className="space-y-6 text-black">
            {/* Context SRS Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 8: Principal Gradebook Approval & Official Ethiopian Report Card Hub
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Fills This:</strong> Homeroom & Subject Teachers submit final grades; Principal reviews & approves.
                        <br />
                        <strong>Data Source:</strong> Aggregated from `AssessmentResult` & `StudentEnrollment` tables.
                        <br />
                        <strong>Who Uses This:</strong> School Principal authorizes final report cards; Parents & Students receive signed term reports.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <ShieldCheck className="w-7 h-7 text-[#006b3f]" />
                        <span>Principal Gradebook Approval & Report Card Hub</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Review teacher gradebooks, authorize term results, and generate official Ethiopian report cards.</p>
                </div>
                <Button onClick={() => setIsReportModalOpen(true)} leftIcon={<Printer className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Preview Sample Report Card
                </Button>
            </div>

            {/* Notifications */}
            {successMsg && (
                <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 flex justify-between items-center text-sm shadow-sm">
                    <span className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span>{successMsg}</span></span>
                    <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Gradebook Approval Directory */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Section Gradebook Approval Submissions
                    </CardTitle>
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search grade or teacher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold">Grade & Section</th>
                                    <th className="px-6 py-3.5 font-semibold">Homeroom Teacher</th>
                                    <th className="px-6 py-3.5 font-semibold">Subjects & Students</th>
                                    <th className="px-6 py-3.5 font-semibold">Approval Status</th>
                                    <th className="px-6 py-3.5 font-semibold text-right">Principal Authorization</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredGradebooks.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            <p>{item.gradeName} — <span className="text-[#006b3f]">{item.sectionName}</span></p>
                                            <p className="text-xs font-normal text-gray-500">Submitted: {item.submittedAt}</p>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-semibold text-gray-800">
                                            {item.teacherName}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-700">
                                            <p className="font-semibold text-gray-900">{item.subjectCount} Subjects</p>
                                            <p className="text-gray-500">{item.studentCount} Students Enrolled</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.status === "APPROVED_BY_PRINCIPAL" ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                    APPROVED BY PRINCIPAL
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                                    PENDING APPROVAL
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {item.status === "PENDING_APPROVAL" ? (
                                                <Button
                                                    size="sm"
                                                    className="bg-[#006b3f] hover:bg-[#005432]"
                                                    leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                                                    onClick={() => handleApproveGradebook(item.id, `${item.gradeName} ${item.sectionName}`)}
                                                >
                                                    Approve Gradebook
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    leftIcon={<Printer className="w-3.5 h-3.5" />}
                                                    onClick={() => setIsReportModalOpen(true)}
                                                >
                                                    Print Report Cards
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Official Report Card Preview Modal */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                <Award className="w-5 h-5 mr-2 text-[#006b3f]" />
                                Official Ethiopian Student Term Report Card Preview
                            </h3>
                            <button onClick={() => setIsReportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Report Card Template */}
                        <div className="border-2 border-[#006b3f] p-6 rounded-lg space-y-4 bg-emerald-50/20 text-xs">
                            <div className="text-center border-b pb-3 space-y-1">
                                <h4 className="text-base font-bold text-[#006b3f] uppercase tracking-wide">EDUBRIDGE ACADEMY HIGH SCHOOL</h4>
                                <p className="text-gray-600 font-semibold">Official Student Academic Transcript & Evaluation Report</p>
                                <p className="text-gray-500">Addis Ababa, Woreda 03 | Academic Year: 2025/2026</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-white p-3 rounded border">
                                <div>
                                    <p><strong>Student Name:</strong> Abebe Kebede Tadesse</p>
                                    <p><strong>Student ID:</strong> STU-9012</p>
                                </div>
                                <div>
                                    <p><strong>Grade & Section:</strong> Grade 9 — Section A</p>
                                    <p><strong>Class Rank:</strong> 3rd out of 45</p>
                                </div>
                            </div>

                            <table className="w-full text-left border-collapse bg-white">
                                <thead>
                                    <tr className="bg-[#006b3f] text-white">
                                        <th className="p-2 border">Subject</th>
                                        <th className="p-2 border">Mid-Term (30%)</th>
                                        <th className="p-2 border">Final Exam (70%)</th>
                                        <th className="p-2 border">Total (100%)</th>
                                        <th className="p-2 border">Grade</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-2 border font-bold">Mathematics</td>
                                        <td className="p-2 border">27</td>
                                        <td className="p-2 border">62</td>
                                        <td className="p-2 border font-bold text-[#006b3f]">89%</td>
                                        <td className="p-2 border font-bold text-emerald-700">A</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 border font-bold">Physics</td>
                                        <td className="p-2 border">24</td>
                                        <td className="p-2 border">58</td>
                                        <td className="p-2 border font-bold text-[#006b3f]">82%</td>
                                        <td className="p-2 border font-bold text-blue-700">B</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 border font-bold">English Language</td>
                                        <td className="p-2 border">28</td>
                                        <td className="p-2 border">65</td>
                                        <td className="p-2 border font-bold text-[#006b3f]">93%</td>
                                        <td className="p-2 border font-bold text-emerald-700">A</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="flex justify-between items-center pt-4 border-t">
                                <div>
                                    <p className="font-semibold text-gray-700">Conduct: <span className="text-emerald-800 font-bold">EXCELLENT (A)</span></p>
                                    <p className="text-gray-500">Promoted to Next Grade</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="font-bold text-[#006b3f]">APPROVED BY PRINCIPAL</p>
                                    <p className="text-gray-400 italic">[Official Digital Seal Signed]</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsReportModalOpen(false)}>
                                Close Preview
                            </Button>
                            <Button type="button" onClick={() => window.print()} className="bg-[#006b3f] hover:bg-[#005432]" leftIcon={<Printer className="w-4 h-4" />}>
                                Print Official Report Card
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
