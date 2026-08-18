"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    AlertTriangle, 
    Plus, 
    CheckCircle2, 
    BookOpen, 
    User, 
    Calendar, 
    Clock, 
    Filter, 
    ShieldAlert, 
    HeartPulse, 
    HelpCircle,
    X,
    Check
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";

type SupportFlagType = "ACADEMIC" | "BEHAVIORAL" | "ATTENDANCE" | "MEDICAL" | "OTHER";

export default function LearningSupportPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [supportFlags, setSupportFlags] = useState<any[]>([]);

    // Selection & Filter States
    const [selectedGradeId, setSelectedGradeId] = useState<string>("");
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");

    // Modal States
    const [isRaiseModalOpen, setIsRaiseModalOpen] = useState(false);
    const [selectedFlagForResolution, setSelectedFlagForResolution] = useState<any | null>(null);

    // Form States
    const [raiseForm, setRaiseForm] = useState({
        enrollmentId: "",
        type: "ACADEMIC" as SupportFlagType,
        description: ""
    });

    const [resolutionNotes, setResolutionNotes] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 1. Initial Load
    const loadInitialData = async () => {
        try {
            setLoading(true);
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            const active = yearsData.find(y => y.status === "ACTIVE");
            setActiveYear(active || null);

            if (active) {
                const sgRes = await fetchApi(`/academic/years/${active.id}/grades`);
                if (sgRes.ok) {
                    const sgData = await sgRes.json();
                    setSchoolGrades(sgData);
                    if (sgData.length > 0) {
                        setSelectedGradeId(sgData[0].id);
                    }
                }
            }

            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    // 2. Sections update on Grade change
    useEffect(() => {
        if (!selectedGradeId) {
            setSections([]);
            setSelectedSectionId("");
            return;
        }

        const currentSG = schoolGrades.find(sg => sg.id === selectedGradeId);
        if (currentSG && currentSG.sections && currentSG.sections.length > 0) {
            setSections(currentSG.sections);
            setSelectedSectionId(currentSG.sections[0].id);
        } else {
            setSections([]);
            setSelectedSectionId("");
        }
    }, [selectedGradeId, schoolGrades]);

    // 3. Fetch Enrollments & Support Flags for Selected Section
    const loadSectionData = async () => {
        if (!selectedSectionId) {
            setEnrollments([]);
            setSupportFlags([]);
            return;
        }

        try {
            // Enrollments
            const enrollRes = await fetchApi("/student/enrollments");
            if (enrollRes.ok) {
                const enrollData = await enrollRes.json();
                const sectionEnrolled = enrollData.filter((e: any) => e.sectionId === selectedSectionId);
                setEnrollments(sectionEnrolled);
            }

            // Support Flags
            const flagRes = await fetchApi(`/learning/support?sectionId=${selectedSectionId}`);
            if (flagRes.ok) {
                const flagData = await flagRes.json();
                setSupportFlags(flagData);
            }
        } catch (err) {
            console.error("Failed to load section support data", err);
        }
    };

    useEffect(() => {
        loadSectionData();
    }, [selectedSectionId]);

    // Raise Support Flag Handler
    const handleRaiseSupportFlag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!raiseForm.enrollmentId || !raiseForm.description) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/learning/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(raiseForm)
            });

            if (!res.ok) throw new Error("Failed to raise support flag");

            setIsRaiseModalOpen(false);
            setRaiseForm({ enrollmentId: "", type: "ACADEMIC", description: "" });
            loadSectionData();
        } catch (err: any) {
            alert(err.message || "Failed to raise support flag");
        } finally {
            setSubmitting(false);
        }
    };

    // Resolve Support Flag Handler
    const handleResolveSupportFlag = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFlagForResolution || !resolutionNotes) return;

        try {
            setSubmitting(true);
            const res = await fetchApi(`/learning/support/${selectedFlagForResolution.id}/resolve`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ resolution: resolutionNotes })
            });

            if (!res.ok) throw new Error("Failed to resolve support flag");

            setSelectedFlagForResolution(null);
            setResolutionNotes("");
            loadSectionData();
        } catch (err: any) {
            alert(err.message || "Failed to resolve support flag");
        } finally {
            setSubmitting(false);
        }
    };

    // Calculate Metrics
    const metrics = useMemo(() => {
        const total = supportFlags.length;
        const academic = supportFlags.filter(f => f.type === "ACADEMIC").length;
        const behavioral = supportFlags.filter(f => f.type === "BEHAVIORAL" || f.type === "ATTENDANCE").length;
        const resolved = supportFlags.filter(f => f.resolvedAt).length;

        return { total, academic, behavioral, resolved };
    }, [supportFlags]);

    // Flag Type Badge Helper
    const getTypeBadge = (type: SupportFlagType) => {
        switch (type) {
            case "ACADEMIC":
                return <span className="bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded text-xs">Academic Need</span>;
            case "BEHAVIORAL":
                return <span className="bg-amber-50 text-amber-700 font-semibold px-2.5 py-0.5 rounded text-xs">Behavioral</span>;
            case "ATTENDANCE":
                return <span className="bg-rose-50 text-rose-700 font-semibold px-2.5 py-0.5 rounded text-xs">Attendance Alert</span>;
            case "MEDICAL":
                return <span className="bg-purple-50 text-purple-700 font-semibold px-2.5 py-0.5 rounded text-xs">Medical</span>;
            default:
                return <span className="bg-gray-50 text-gray-700 font-semibold px-2.5 py-0.5 rounded text-xs">{type}</span>;
        }
    };

    if (loading) return <LoadingState message="Loading student support & interventions..." />;
    if (error) return <ErrorState message={error} onRetry={loadInitialData} />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <AlertTriangle className="w-7 h-7 mr-2 text-[#006b3f]" />
                        Student Support & Learning Interventions
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Identify, flag, and coordinate interventions for struggling students in <span className="font-semibold text-[#006b3f]">{activeYear?.name}</span>
                    </p>
                </div>

                <Button 
                    onClick={() => setIsRaiseModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="bg-[#006b3f] hover:bg-[#005432]"
                >
                    Raise Support Flag
                </Button>
            </div>

            {/* Filter Controls */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-full sm:w-1/2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                            School Grade
                        </label>
                        <select
                            value={selectedGradeId}
                            onChange={(e) => setSelectedGradeId(e.target.value)}
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] outline-none font-medium text-gray-900"
                        >
                            {schoolGrades.map((sg) => (
                                <option key={sg.id} value={sg.id}>
                                    {sg.grade?.name || "Grade"}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full sm:w-1/2">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                            Class Section
                        </label>
                        <select
                            value={selectedSectionId}
                            onChange={(e) => setSelectedSectionId(e.target.value)}
                            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] outline-none font-medium text-gray-900"
                        >
                            {sections.map((s) => (
                                <option key={s.id} value={s.id}>
                                    Section {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </CardContent>
            </Card>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="bg-white border-gray-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Total Support Flags</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.total}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 border-blue-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-blue-700 font-semibold uppercase">Academic Need</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{metrics.academic}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-blue-700" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-rose-50/50 border-rose-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-rose-700 font-semibold uppercase">Behavior / Attendance</p>
                            <p className="text-2xl font-bold text-rose-900 mt-1">{metrics.behavioral}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                            <ShieldAlert className="w-5 h-5 text-rose-700" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50/50 border-emerald-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-emerald-700 font-semibold uppercase">Resolved Cases</p>
                            <p className="text-2xl font-bold text-emerald-900 mt-1">{metrics.resolved}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Support Flags Table */}
            {supportFlags.length === 0 ? (
                <EmptyState 
                    title="No Support Flags Raised" 
                    message="There are no active support flags or interventions logged for this section." 
                />
            ) : (
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gray-50/70 border-b border-gray-200 py-4">
                        <CardTitle className="text-base font-semibold text-gray-900">
                            Support Flags & Intervention Roster
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Student Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Flag Category</th>
                                        <th className="px-6 py-3.5 font-semibold">Description</th>
                                        <th className="px-6 py-3.5 font-semibold">Status & Resolution</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {supportFlags.map((flag) => {
                                        const isResolved = Boolean(flag.resolvedAt);
                                        return (
                                            <tr key={flag.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-gray-900">
                                                        {flag.enrollment?.student?.firstName} {flag.enrollment?.student?.lastName}
                                                    </p>
                                                    <span className="text-xs text-gray-500 font-mono">
                                                        ID: {flag.enrollment?.studentIdCode || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getTypeBadge(flag.type)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-700 max-w-xs">
                                                    <p className="line-clamp-2">{flag.description}</p>
                                                    <span className="text-[11px] text-gray-400 block mt-0.5">
                                                        Raised: {new Date(flag.createdAt).toLocaleDateString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isResolved ? (
                                                        <div className="space-y-1">
                                                            <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> RESOLVED
                                                            </span>
                                                            <p className="text-xs text-gray-600 italic">
                                                                "{flag.resolution}"
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                                            <Clock className="w-3.5 h-3.5 mr-1" /> ACTIVE INTERVENTION
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {!isResolved && (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => setSelectedFlagForResolution(flag)}
                                                            leftIcon={<Check className="w-3.5 h-3.5" />}
                                                        >
                                                            Resolve
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Raise Support Flag Modal */}
            {isRaiseModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <form onSubmit={handleRaiseSupportFlag} className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">
                                Raise Student Support Flag
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setIsRaiseModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Select Student ({enrollments.length} in section)
                            </label>
                            <select
                                required
                                value={raiseForm.enrollmentId}
                                onChange={(e) => setRaiseForm(prev => ({ ...prev, enrollmentId: e.target.value }))}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900 font-medium"
                            >
                                <option value="">-- Select Student --</option>
                                {enrollments.map((e) => (
                                    <option key={e.id} value={e.id}>
                                        {e.student?.firstName} {e.student?.lastName} ({e.studentIdCode || "ID N/A"})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Support Need Category
                            </label>
                            <select
                                value={raiseForm.type}
                                onChange={(e) => setRaiseForm(prev => ({ ...prev, type: e.target.value as SupportFlagType }))}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900 font-medium"
                            >
                                <option value="ACADEMIC">ACADEMIC (Academic Struggling / Tutoring Need)</option>
                                <option value="BEHAVIORAL">BEHAVIORAL (Discipline / Classroom Engagement)</option>
                                <option value="ATTENDANCE">ATTENDANCE (Chronic Absence / Tardiness)</option>
                                <option value="MEDICAL">MEDICAL (Health / Physical Support)</option>
                                <option value="OTHER">OTHER (General Support)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Flag Description & Intervention Plan Notes
                            </label>
                            <textarea
                                required
                                rows={4}
                                placeholder="Describe the specific support issue or reason for flagging..."
                                value={raiseForm.description}
                                onChange={(e) => setRaiseForm(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900 resize-none"
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-3 border-t">
                            <Button type="button" variant="outline" onClick={() => setIsRaiseModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">
                                Raise Support Flag
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Resolve Flag Modal */}
            {selectedFlagForResolution && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <form onSubmit={handleResolveSupportFlag} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">
                                Resolve Support Intervention
                            </h3>
                            <button 
                                type="button" 
                                onClick={() => setSelectedFlagForResolution(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-gray-600">
                            Student: <strong className="text-gray-900">{selectedFlagForResolution.enrollment?.student?.firstName} {selectedFlagForResolution.enrollment?.student?.lastName}</strong> ({selectedFlagForResolution.type})
                        </p>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                                Resolution Summary & Outcome Notes
                            </label>
                            <textarea
                                required
                                rows={4}
                                placeholder="Describe how the support issue was addressed and resolved..."
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#006b3f] text-gray-900 resize-none"
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-3 border-t">
                            <Button type="button" variant="outline" onClick={() => setSelectedFlagForResolution(null)}>
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">
                                Mark Resolved
                            </Button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
