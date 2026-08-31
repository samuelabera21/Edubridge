"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    CheckCircle2, 
    FileCheck, 
    Search, 
    Clock, 
    AlertTriangle, 
    UserCheck, 
    ShieldCheck, 
    X, 
    Edit3
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

interface CorrectionAuditLog {
    id: string;
    studentName: string;
    studentIdCode: string;
    gradeSection: string;
    date: string;
    previousStatus: string;
    correctedStatus: string;
    reason: string;
    authorizedBy: string;
    createdAt: string;
}

export default function AttendanceCorrectionsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const [auditLogs, setAuditLogs] = useState<CorrectionAuditLog[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal state for filing official override
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        studentName: "",
        studentIdCode: "",
        date: new Date().toISOString().split("T")[0],
        correctedStatus: "EXCUSED",
        reasonCategory: "MEDICAL_CERTIFICATE",
        officialJustification: ""
    });

    const loadAuditLogs = async () => {
        try {
            setLoading(true);
            
            // Sample Audit Log entries
            const sampleLogs: CorrectionAuditLog[] = [
                {
                    id: "aud-01",
                    studentName: "Abebe Kebede Tadesse",
                    studentIdCode: "STU-9012",
                    gradeSection: "Grade 9 - Sec A",
                    date: new Date().toISOString().split("T")[0],
                    previousStatus: "ABSENT",
                    correctedStatus: "EXCUSED",
                    reason: "Medical Certificate submitted from Tikur Anbessa Hospital",
                    authorizedBy: authData?.user.name || "School Principal",
                    createdAt: new Date().toISOString()
                }
            ];

            setAuditLogs(sampleLogs);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAuditLogs();
    }, []);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.studentName.trim() || !formData.officialJustification.trim()) {
            setErrorMsg("Student name and official justification are required.");
            return;
        }

        try {
            setSubmitting(true);
            setErrorMsg(null);

            const newLog: CorrectionAuditLog = {
                id: `aud-${Date.now()}`,
                studentName: formData.studentName.trim(),
                studentIdCode: formData.studentIdCode.trim() || "STU-0000",
                gradeSection: "Grade 10 - Sec A",
                date: formData.date,
                previousStatus: "ABSENT",
                correctedStatus: formData.correctedStatus,
                reason: `${formData.reasonCategory.replace("_", " ")}: ${formData.officialJustification.trim()}`,
                authorizedBy: authData?.user.name || "School Principal",
                createdAt: new Date().toISOString()
            };

            setAuditLogs(prev => [newLog, ...prev]);
            setSuccessMsg(`Official attendance override approved & recorded for ${formData.studentName}.`);
            setIsOverrideModalOpen(false);
            setFormData({
                studentName: "",
                studentIdCode: "",
                date: new Date().toISOString().split("T")[0],
                correctedStatus: "EXCUSED",
                reasonCategory: "MEDICAL_CERTIFICATE",
                officialJustification: ""
            });
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to submit attendance correction.");
        } finally {
            setSubmitting(false);
        }
    };

    const filteredLogs = auditLogs.filter(log => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            log.studentName.toLowerCase().includes(q) ||
            log.studentIdCode.toLowerCase().includes(q) ||
            log.reason.toLowerCase().includes(q)
        );
    });

    if (loading) return <LoadingState message="Loading Principal Attendance Corrections Hub..." />;

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <FileCheck className="w-7 h-7 text-[#006b3f]" />
                        <span>Principal Attendance Corrections & Override Hub</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Authorize official excuses (Medical, Woreda events) and audit attendance override logs.</p>
                </div>
                <Button 
                    onClick={() => setIsOverrideModalOpen(true)}
                    leftIcon={<Edit3 className="w-4 h-4" />}
                    className="bg-[#006b3f] hover:bg-[#005432]"
                >
                    File Official Override
                </Button>
            </div>

            {/* Notification messages */}
            {successMsg && (
                <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 flex justify-between items-center text-sm shadow-sm">
                    <span className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span>{successMsg}</span></span>
                    <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}
            {errorMsg && (
                <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 flex justify-between items-center text-sm shadow-sm">
                    <span className="flex items-center space-x-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span>{errorMsg}</span></span>
                    <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Audit Trail Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <ShieldCheck className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Principal Override Audit Log History
                    </CardTitle>
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search student or reason..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredLogs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <FileCheck className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                            <p className="font-semibold text-gray-700">No attendance override audit logs found</p>
                            <p className="text-xs text-gray-400 mt-1">Official principal attendance corrections will be permanently logged here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Student Name & ID</th>
                                        <th className="px-6 py-3.5 font-semibold">Date</th>
                                        <th className="px-6 py-3.5 font-semibold">Status Change</th>
                                        <th className="px-6 py-3.5 font-semibold">Official Justification</th>
                                        <th className="px-6 py-3.5 font-semibold">Authorized By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                <p>{log.studentName}</p>
                                                <p className="text-xs font-mono font-normal text-gray-500">{log.studentIdCode}</p>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-gray-700">
                                                {log.date}
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 mr-1.5">
                                                    {log.previousStatus}
                                                </span>
                                                <span className="text-gray-400 font-bold">&rarr;</span>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 ml-1.5">
                                                    {log.correctedStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-700">
                                                {log.reason}
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">
                                                {log.authorizedBy}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Override Modal */}
            {isOverrideModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">File Official Attendance Correction</h3>
                            <button onClick={() => setIsOverrideModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Student Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.studentName}
                                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                                    placeholder="e.g. Abebe Kebede Tadesse"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Student ID Code</label>
                                    <input
                                        type="text"
                                        value={formData.studentIdCode}
                                        onChange={(e) => setFormData({ ...formData, studentIdCode: e.target.value })}
                                        placeholder="STU-9012"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Absence Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Corrected Status *</label>
                                    <select
                                        value={formData.correctedStatus}
                                        onChange={(e) => setFormData({ ...formData, correctedStatus: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="EXCUSED">EXCUSED (Medical/Official)</option>
                                        <option value="PRESENT">PRESENT (Confirmed Attendance)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Excuse Category *</label>
                                    <select
                                        value={formData.reasonCategory}
                                        onChange={(e) => setFormData({ ...formData, reasonCategory: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="MEDICAL_CERTIFICATE">Medical Certificate</option>
                                        <option value="WOREDA_COMPETITION">Official Woreda Event</option>
                                        <option value="FAMILY_BEREAVEMENT">Family Bereavement</option>
                                        <option value="ADMINISTRATIVE_CORRECTION">Roster Error Correction</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Official Justification / Certificate No. *</label>
                                <textarea
                                    required
                                    value={formData.officialJustification}
                                    onChange={(e) => setFormData({ ...formData, officialJustification: e.target.value })}
                                    placeholder="Enter clinic/hospital name, certificate reference number, or official explanation..."
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsOverrideModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">
                                    Approve & Log Correction
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
