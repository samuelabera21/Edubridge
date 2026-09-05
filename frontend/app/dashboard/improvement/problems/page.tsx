"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    AlertCircle, 
    Plus, 
    Search, 
    Sparkles, 
    ShieldAlert, 
    X,
    FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function IdentifySchoolProblemsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [problems, setProblems] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        problemTitle: "",
        category: "ACADEMIC",
        severity: "HIGH",
        description: ""
    });

    const loadProblems = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/improvement/problems");
            if (res.ok) {
                const data = await res.json();
                setProblems(Array.isArray(data) ? data : []);
            } else {
                setProblems([]);
            }
        } catch (err: any) {
            console.error(err);
            setProblems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProblems();
    }, []);

    const handleCreateProblem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.problemTitle.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/improvement/problems", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({ problemTitle: "", category: "ACADEMIC", severity: "HIGH", description: "" });
                loadProblems();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Loading identified school challenges from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-red-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-red-700" />
                        SRS Domain 12.1: School Problem Identification & Diagnosis
                    </span>
                    <p className="text-red-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & School Quality Assurance Committee.
                        <br />
                        <strong>Data Source:</strong> Database table `school_problem` queried via REST API (`/api/improvement/problems`).
                        <br />
                        <strong>SRS Purpose:</strong> Logs root-cause institutional challenges (Academic deficiencies, infrastructure deficits, chronic attendance issues).
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <AlertCircle className="w-7 h-7 text-red-600" />
                        <span>1. Identify School Problems</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Registry of diagnosed institutional challenges, severity ratings, and root causes.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-red-700 hover:bg-red-800 text-white">
                    Log School Challenge
                </Button>
            </div>

            {/* Directory Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <ShieldAlert className="w-5 h-5 mr-2 text-red-600" />
                        Identified Institutional Challenges
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {problems.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <AlertCircle className="w-12 h-12 mx-auto text-red-300 mb-2" />
                            <p className="font-semibold text-gray-800">No school problems logged in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Log School Challenge" above to record a diagnosed problem area.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Problem Title</th>
                                        <th className="px-6 py-3.5 font-semibold">Category</th>
                                        <th className="px-6 py-3.5 font-semibold">Severity</th>
                                        <th className="px-6 py-3.5 font-semibold">Description</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {problems.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.problemTitle}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">{p.category}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                    p.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {p.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-600 truncate max-w-xs">{p.description || "N/A"}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                    {p.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Log Diagnosed School Challenge</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateProblem} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Problem Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.problemTitle}
                                    onChange={(e) => setForm({ ...form, problemTitle: e.target.value })}
                                    placeholder="e.g. Low Grade 12 National Exam STEM Pass Rate"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Category</label>
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="ACADEMIC">Academic Deficit</option>
                                        <option value="INFRASTRUCTURE">Infrastructure & Lab Facilities</option>
                                        <option value="ATTENDANCE">Attendance & Dropout Rate</option>
                                        <option value="GOVERNANCE">Governance & Staffing</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Severity Level</label>
                                    <select
                                        value={form.severity}
                                        onChange={(e) => setForm({ ...form, severity: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="CRITICAL">Critical</option>
                                        <option value="HIGH">High Priority</option>
                                        <option value="MEDIUM">Medium Priority</option>
                                        <option value="LOW">Low Priority</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Root Cause Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="Describe root cause and affected student cohorts..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-red-700 hover:bg-red-800 text-white">Save Challenge</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
