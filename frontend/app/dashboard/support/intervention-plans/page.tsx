"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { 
    FileText, 
    Plus, 
    Sparkles, 
    Target, 
    X
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

type StudentEnrollmentOption = {
    id: string;
    status: string;
    student: { id: string; firstName: string; lastName: string; studentId: string };
    schoolGrade?: { grade?: { name?: string; level?: string | number } };
    section?: { name: string } | null;
};

type InterventionPlanRecord = {
    id: string;
    studentName: string;
    gradeName: string;
    targetScore: string;
    counselorName?: string | null;
    reviewDate?: string | null;
    status: string;
};

export default function InterventionPlansPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [plans, setPlans] = useState<InterventionPlanRecord[]>([]);
    const [enrollments, setEnrollments] = useState<StudentEnrollmentOption[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        studentId: "",
        targetScore: "65%",
        counselorName: "",
        reviewDate: new Date().toISOString().split("T")[0],
        strategyNotes: ""
    });

    const loadPlans = async () => {
        try {
            const [res, enrollmentResponse] = await Promise.all([
                fetchApi("/support/intervention-plans"),
                fetchApi("/student/enrollments")
            ]);
            if (res.ok) {
                const data = await res.json();
                setPlans(Array.isArray(data) ? data as InterventionPlanRecord[] : []);
            } else {
                setPlans([]);
            }
            if (enrollmentResponse.ok) {
                const data = await enrollmentResponse.json();
                setEnrollments(Array.isArray(data) ? (data as StudentEnrollmentOption[]).filter((item) => ["ACTIVE", "ENROLLED"].includes(item.status)) : []);
            }
        } catch (err: unknown) {
            console.error(err);
            setPlans([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(loadPlans);
    }, []);

    const handleCreatePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.studentId) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/support/intervention-plans", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({
                    studentId: "",
                    targetScore: "65%",
                    counselorName: "",
                    reviewDate: new Date().toISOString().split("T")[0],
                    strategyNotes: ""
                });
                loadPlans();
            }
        } catch (err: unknown) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Loading student intervention plans from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 9.5: Individualized Student Intervention Plans
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Uses This:</strong> School Principal, Guidance Counselors & Homeroom Teachers.
                        <br />
                        <strong>Data Source:</strong> Database table `intervention_plan` queried via REST API (`/api/support/intervention-plans`).
                        <br />
                        <strong>SRS Purpose:</strong> Formulates specific academic & behavioral target goals, review frequencies, and multi-stakeholder support contracts.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Target className="w-7 h-7 text-[#006b3f]" />
                        <span>5. Individualized Intervention Plans</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Formal academic & behavioral intervention contracts and target milestones.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Formulate Intervention Plan
                </Button>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Active Student Intervention Plans
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {plans.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Target className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-800">No active intervention plans created in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click &quot;Formulate Intervention Plan&quot; above to set target GPA scores &amp; counselor review dates.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Student Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Grade</th>
                                        <th className="px-6 py-3.5 font-semibold">Target Score</th>
                                        <th className="px-6 py-3.5 font-semibold">Assigned Counselor</th>
                                        <th className="px-6 py-3.5 font-semibold">Review Date</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {plans.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.studentName}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">{p.gradeName}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-purple-700">{p.targetScore}</td>
                                            <td className="px-6 py-4 text-xs font-medium text-gray-800">{p.counselorName || "Lead Counselor"}</td>
                                            <td className="px-6 py-4 text-xs text-gray-600">
                                                {p.reviewDate ? new Date(p.reviewDate).toLocaleDateString() : "Pending"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
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
                            <h3 className="text-lg font-bold text-gray-900">Formulate Intervention Plan</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreatePlan} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Student *</label>
                                <select
                                    required
                                    value={form.studentId}
                                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                >
                                    <option value="">Choose an enrolled student</option>
                                    {enrollments.map((enrollment) => (
                                        <option key={enrollment.id} value={enrollment.student.id}>
                                            {enrollment.student.firstName} {enrollment.student.lastName} · {enrollment.student.studentId} · Grade {enrollment.schoolGrade?.grade?.level ?? enrollment.schoolGrade?.grade?.name ?? ""} {enrollment.section?.name ?? ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Grade Level</label>
                                    <p className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-600">
                                        {enrollments.find((enrollment) => enrollment.student.id === form.studentId)?.schoolGrade?.grade?.level ?? enrollments.find((enrollment) => enrollment.student.id === form.studentId)?.schoolGrade?.grade?.name ?? "Selected from student enrollment"}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Target Score %</label>
                                    <input
                                        type="text"
                                        value={form.targetScore}
                                        onChange={(e) => setForm({ ...form, targetScore: e.target.value })}
                                        placeholder="e.g. 65%"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Assigned Counselor</label>
                                    <input
                                        type="text"
                                        value={form.counselorName}
                                        onChange={(e) => setForm({ ...form, counselorName: e.target.value })}
                                        placeholder="e.g. Counselor Solomon"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Review Date</label>
                                    <input
                                        type="date"
                                        value={form.reviewDate}
                                        onChange={(e) => setForm({ ...form, reviewDate: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Intervention Strategies & Actions</label>
                                <textarea
                                    value={form.strategyNotes}
                                    onChange={(e) => setForm({ ...form, strategyNotes: e.target.value })}
                                    placeholder="e.g. Bi-weekly math counseling, peer tutoring..."
                                    rows={2}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Create Plan</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
