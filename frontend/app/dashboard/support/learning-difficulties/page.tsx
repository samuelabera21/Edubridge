"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    HeartHandshake, 
    Plus, 
    Search, 
    Sparkles, 
    CheckCircle2, 
    Clock, 
    ShieldAlert, 
    X,
    FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function LearningDifficultiesPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [form, setForm] = useState({
        studentName: "",
        gradeName: "",
        conditionType: "DYSLEXIA",
        accommodationNotes: "",
        examTimeExtensionMinutes: "30"
    });

    const loadRecords = async () => {
        try {
            setLoading(true);
            // Fetch learning difficulties registry
            setRecords([]);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecords();
    }, []);

    const handleCreateRecord = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.studentName.trim() || !form.gradeName.trim()) return;

        const newRecord = {
            id: Date.now().toString(),
            studentName: form.studentName,
            gradeName: form.gradeName,
            conditionType: form.conditionType,
            accommodationNotes: form.accommodationNotes,
            examTimeExtensionMinutes: form.examTimeExtensionMinutes,
            createdAt: new Date().toISOString().split("T")[0]
        };

        setRecords(prev => [newRecord, ...prev]);
        setIsModalOpen(false);
        setForm({
            studentName: "",
            gradeName: "",
            conditionType: "DYSLEXIA",
            accommodationNotes: "",
            examTimeExtensionMinutes: "30"
        });
    };

    if (loading) return <LoadingState message="Loading learning difficulty & accommodation records..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-purple-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-purple-700" />
                        SRS Domain 9.2: Learning Difficulties & IEP Registry
                    </span>
                    <p className="text-purple-800">
                        <strong>Who Uses This:</strong> Guidance Counselors, Special Education Staff & School Principal.
                        <br />
                        <strong>Data Source:</strong> Individualized Education Plan (IEP) records stored in the database.
                        <br />
                        <strong>SRS Purpose:</strong> Ensures approved classroom accommodations (e.g. +30 mins extra exam time, large print, preferential seating) are granted to students with special learning needs.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <HeartHandshake className="w-7 h-7 text-purple-600" />
                        <span>2. Learning Difficulties & IEP Registry</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage Individualized Education Plans (IEP) and approved examination accommodations.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Register IEP / Accommodation
                </Button>
            </div>

            {/* Directory Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-purple-600" />
                        Registered Student Accommodations
                    </CardTitle>
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search student or condition..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {records.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <HeartHandshake className="w-12 h-12 mx-auto text-purple-300 mb-2" />
                            <p className="font-semibold text-gray-800">No learning difficulty records registered</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Register IEP / Accommodation" above to record approved student learning accommodations.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Student Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Grade</th>
                                        <th className="px-6 py-3.5 font-semibold">Condition</th>
                                        <th className="px-6 py-3.5 font-semibold">Exam Extension</th>
                                        <th className="px-6 py-3.5 font-semibold">Accommodations</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {records.map((r) => (
                                        <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{r.studentName}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">{r.gradeName}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                                    {r.conditionType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-blue-700">
                                                +{r.examTimeExtensionMinutes} Minutes
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-700">{r.accommodationNotes || "Standard IEP"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Register Student IEP / Accommodation</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateRecord} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Student Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.studentName}
                                    onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                                    placeholder="e.g. Dawit Yohannes"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Grade Level *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.gradeName}
                                    onChange={(e) => setForm({ ...form, gradeName: e.target.value })}
                                    placeholder="e.g. Grade 9"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Condition Type</label>
                                    <select
                                        value={form.conditionType}
                                        onChange={(e) => setForm({ ...form, conditionType: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="DYSLEXIA">Dyslexia / Reading</option>
                                        <option value="ADHD">ADHD / Focus</option>
                                        <option value="VISUAL_IMPAIRMENT">Visual Impairment</option>
                                        <option value="HEARING_IMPAIRMENT">Hearing Impairment</option>
                                        <option value="OTHER">Other Accommodation</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Exam Time Extension</label>
                                    <input
                                        type="number"
                                        value={form.examTimeExtensionMinutes}
                                        onChange={(e) => setForm({ ...form, examTimeExtensionMinutes: e.target.value })}
                                        placeholder="30"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Approved Classroom Accommodations</label>
                                <textarea
                                    value={form.accommodationNotes}
                                    onChange={(e) => setForm({ ...form, accommodationNotes: e.target.value })}
                                    placeholder="e.g. Front row seating, oral exam option..."
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-[#006b3f] hover:bg-[#005432]">Save Accommodation</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
