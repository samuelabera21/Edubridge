"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    AlertTriangle, 
    Phone, 
    Mail, 
    ShieldAlert, 
    CheckCircle2, 
    Search, 
    X, 
    UserCheck, 
    FileText,
    Calendar,
    Clock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

interface RepeatedAbsenceAlert {
    id: string;
    studentName: string;
    studentIdCode: string;
    gradeName: string;
    sectionName: string;
    consecutiveAbsentDays: number;
    lastAbsentDate: string;
    parentPhone?: string;
    parentName?: string;
    riskLevel: "HIGH" | "MODERATE";
    status: "OPEN" | "CONTACTED" | "RESOLVED";
}

export default function AttendanceAlertsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<RepeatedAbsenceAlert[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRisk, setSelectedRisk] = useState("ALL");
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Modal state for parent contact log
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [activeAlert, setActiveAlert] = useState<RepeatedAbsenceAlert | null>(null);
    const [contactNotes, setContactNotes] = useState("");

    const loadAlerts = async () => {
        try {
            setLoading(true);
            
            // Dummy / Mock initial alerts for demonstration
            const sampleAlerts: RepeatedAbsenceAlert[] = [
                {
                    id: "alt-01",
                    studentName: "Abebe Kebede Tadesse",
                    studentIdCode: "STU-9012",
                    gradeName: "Grade 9",
                    sectionName: "Section A",
                    consecutiveAbsentDays: 5,
                    lastAbsentDate: new Date().toISOString().split("T")[0],
                    parentPhone: "+251 91 123 4567",
                    parentName: "Kebede Tadesse",
                    riskLevel: "HIGH",
                    status: "OPEN"
                },
                {
                    id: "alt-02",
                    studentName: "Marta Haile Sellassie",
                    studentIdCode: "STU-9045",
                    gradeName: "Grade 10",
                    sectionName: "Section B",
                    consecutiveAbsentDays: 3,
                    lastAbsentDate: new Date().toISOString().split("T")[0],
                    parentPhone: "+251 92 888 7766",
                    parentName: "Haile Sellassie",
                    riskLevel: "MODERATE",
                    status: "OPEN"
                }
            ];

            setAlerts(sampleAlerts);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAlerts();
    }, []);

    const handleOpenContactModal = (alert: RepeatedAbsenceAlert) => {
        setActiveAlert(alert);
        setContactNotes("");
        setIsContactModalOpen(true);
    };

    const handleLogContactSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAlert) return;

        setAlerts(prev => prev.map(a => a.id === activeAlert.id ? { ...a, status: "CONTACTED" } : a));
        setSuccessMsg(`Parent contact logged for ${activeAlert.studentName}. Status updated to CONTACTED.`);
        setIsContactModalOpen(false);
    };

    const filteredAlerts = alerts.filter(a => {
        const matchesRisk = selectedRisk === "ALL" || a.riskLevel === selectedRisk;
        const matchesSearch = !searchQuery.trim() ||
            a.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.studentIdCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.gradeName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesRisk && matchesSearch;
    });

    const highRiskCount = alerts.filter(a => a.riskLevel === "HIGH").length;
    const moderateRiskCount = alerts.filter(a => a.riskLevel === "MODERATE").length;

    if (loading) return <LoadingState message="Scanning repeated unexcused absence alerts..." />;

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <ShieldAlert className="w-7 h-7 text-red-600" />
                        <span>Repeated Absence Alert Hub</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Automatic detection of students with 3+ consecutive unexcused absences for early intervention.</p>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-red-50/60 border-red-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-red-100 text-red-600 rounded-lg">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">High Risk (&ge;5 Days)</p>
                            <p className="text-xl font-bold text-red-800">{highRiskCount}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50/60 border-amber-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Moderate Risk (3-4 Days)</p>
                            <p className="text-xl font-bold text-amber-800">{moderateRiskCount}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50/60 border-emerald-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Resolved Alerts</p>
                            <p className="text-xl font-bold text-gray-900">{alerts.filter(a => a.status === "RESOLVED").length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/60 border-blue-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                            <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Parent Contacted</p>
                            <p className="text-xl font-bold text-gray-900">{alerts.filter(a => a.status === "CONTACTED").length}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notification messages */}
            {successMsg && (
                <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 flex justify-between items-center text-sm shadow-sm">
                    <span className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><span>{successMsg}</span></span>
                    <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Filter Tabs & Search */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
                        {["ALL", "HIGH", "MODERATE"].map(r => (
                            <button
                                key={r}
                                onClick={() => setSelectedRisk(r)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    selectedRisk === r
                                        ? "bg-red-600 text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {r === "ALL" ? "All Risk Levels" : `${r} RISK`}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search student or grade..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                        />
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filteredAlerts.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-700">No repeated absence alerts</p>
                            <p className="text-xs text-gray-400 mt-1">Students with 3+ consecutive unexcused absences will automatically trigger an alert here.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Student & ID</th>
                                        <th className="px-6 py-3.5 font-semibold">Grade / Section</th>
                                        <th className="px-6 py-3.5 font-semibold">Consecutive Days</th>
                                        <th className="px-6 py-3.5 font-semibold">Parent Contact</th>
                                        <th className="px-6 py-3.5 font-semibold">Risk Status</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Intervention</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredAlerts.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                <p>{item.studentName}</p>
                                                <p className="text-xs font-mono font-normal text-gray-500">{item.studentIdCode}</p>
                                            </td>
                                            <td className="px-6 py-4 text-gray-700">
                                                <span className="font-semibold">{item.gradeName}</span> — <span className="text-[#006b3f]">{item.sectionName}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-800">
                                                    {item.consecutiveAbsentDays} Days Absent
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-700">
                                                <p className="font-medium text-gray-900">{item.parentName || "Guardian"}</p>
                                                <p className="text-gray-500 flex items-center mt-0.5"><Phone className="w-3 h-3 mr-1" />{item.parentPhone || "N/A"}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.riskLevel === "HIGH" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">
                                                        HIGH RISK
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                                                        MODERATE RISK
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    leftIcon={<Phone className="w-3.5 h-3.5" />}
                                                    onClick={() => handleOpenContactModal(item)}
                                                >
                                                    {item.status === "CONTACTED" ? "Logged" : "Log Contact"}
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

            {/* Log Parent Contact Modal */}
            {isContactModalOpen && activeAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Log Parent Call / Intervention</h3>
                            <button onClick={() => setIsContactModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-800 space-y-1">
                            <p className="font-bold">{activeAlert.studentName} ({activeAlert.studentIdCode})</p>
                            <p>Absent for <strong>{activeAlert.consecutiveAbsentDays} consecutive days</strong> in {activeAlert.gradeName} - {activeAlert.sectionName}.</p>
                            <p>Parent Phone: <strong>{activeAlert.parentPhone}</strong></p>
                        </div>

                        <form onSubmit={handleLogContactSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Intervention / Call Notes *</label>
                                <textarea
                                    required
                                    value={contactNotes}
                                    onChange={(e) => setContactNotes(e.target.value)}
                                    placeholder="Spoke with parent regarding student absence. Parent confirmed illness / family emergency..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsContactModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                                    Save Contact Log
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
