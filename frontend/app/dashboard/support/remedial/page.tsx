"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { 
    BookOpen, 
    Plus, 
    Sparkles, 
    Calendar, 
    X
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

type Enrollment = {
    id: string;
    status: string;
    student: { firstName: string; lastName: string };
    schoolGrade?: { grade?: { level?: string | number; name?: string } };
    section?: { name: string } | null;
};

type RemedialProgram = {
    id: string;
    programTitle: string;
    subjectName: string;
    gradeName: string;
    leadTeacher: string;
    scheduleTime: string;
    enrolledCount: number;
    maxCapacity: number;
    _count?: { assignments: number };
};

export default function RemedialProgramsPage() {
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [programs, setPrograms] = useState<RemedialProgram[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        programTitle: "",
        subjectName: "",
        leadTeacher: "",
        gradeName: "",
        scheduleTime: "Saturday 9:00 AM - 11:30 AM",
        maxCapacity: "30"
    });

    const loadPrograms = async () => {
        try {
            const [res, enrollmentResponse] = await Promise.all([
                fetchApi("/support/remedial"),
                fetchApi("/student/enrollments")
            ]);
            if (res.ok) {
                const data = await res.json();
                setPrograms(Array.isArray(data) ? data as RemedialProgram[] : []);
            } else {
                setPrograms([]);
            }
            if (enrollmentResponse.ok) {
                const data = await enrollmentResponse.json();
                setEnrollments(Array.isArray(data) ? (data as Enrollment[]).filter((item) => ["ACTIVE", "ENROLLED"].includes(item.status)) : []);
            }
        } catch (err: unknown) {
            console.error(err);
            setPrograms([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void Promise.resolve().then(loadPrograms);
    }, []);

    const handleCreateProgram = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.programTitle.trim() || !form.subjectName.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/support/remedial", {
                method: "POST",
                body: JSON.stringify({ ...form, enrollmentIds: selectedEnrollmentIds })
            });

            if (res.ok) {
                setIsModalOpen(false);
                setSelectedEnrollmentIds([]);
                setForm({
                    programTitle: "",
                    subjectName: "",
                    leadTeacher: "",
                    gradeName: "",
                    scheduleTime: "Saturday 9:00 AM - 11:30 AM",
                    maxCapacity: "30"
                });
                loadPrograms();
            }
        } catch (err: unknown) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState message="Loading remedial tutorial programs from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 9.3: Remedial Tutorial Program Manager
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Uses This:</strong> Vice-Principals, Department Heads & Remedial Lead Teachers.
                        <br />
                        <strong>Data Source:</strong> Database table `remedial_program` queried via REST API (`/api/support/remedial`).
                        <br />
                        <strong>SRS Purpose:</strong> Schedules after-school and weekend tutorial sessions to reinforce difficult concepts for struggling students.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <BookOpen className="w-7 h-7 text-[#006b3f]" />
                        <span>3. Remedial Programs & Tutorial Sessions</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Saturday and after-school remedial tutorial classes and lead instructor assignments.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Create Remedial Class
                </Button>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Active Remedial Tutorial Classes
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    {programs.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <BookOpen className="w-12 h-12 mx-auto text-emerald-300 mb-2" />
                            <p className="font-semibold text-gray-800">No active remedial programs found in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click &quot;Create Remedial Class&quot; above to set up Saturday or after-school tutorial classes.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Program Title</th>
                                        <th className="px-6 py-3.5 font-semibold">Subject & Grade</th>
                                        <th className="px-6 py-3.5 font-semibold">Lead Teacher</th>
                                        <th className="px-6 py-3.5 font-semibold">Schedule Time</th>
                                        <th className="px-6 py-3.5 font-semibold">Capacity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {programs.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">{p.programTitle}</td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">
                                                {p.subjectName} ({p.gradeName})
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-gray-800">{p.leadTeacher}</td>
                                            <td className="px-6 py-4 text-xs text-gray-600">{p.scheduleTime}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-purple-700">
                                                {p._count?.assignments ?? p.enrolledCount} / {p.maxCapacity} Enrolled
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
                            <h3 className="text-lg font-bold text-gray-900">Create Remedial Class / Program</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateProgram} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Program Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.programTitle}
                                    onChange={(e) => setForm({ ...form, programTitle: e.target.value })}
                                    placeholder="e.g. Saturday Grade 9 Physics Reinforcement"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Subject *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.subjectName}
                                        onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                                        placeholder="e.g. Physics"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Target Grade *</label>
                                    <input
                                        type="text"
                                        required
                                        value={form.gradeName}
                                        onChange={(e) => setForm({ ...form, gradeName: e.target.value })}
                                        placeholder="e.g. Grade 9"
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Lead Instructor *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.leadTeacher}
                                    onChange={(e) => setForm({ ...form, leadTeacher: e.target.value })}
                                    placeholder="e.g. Abebe Bikila"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Schedule & Location</label>
                                <input
                                    type="text"
                                    value={form.scheduleTime}
                                    onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })}
                                    placeholder="Saturday 9:00 AM - 11:30 AM"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Assign to Students *</label>
                                <select
                                    multiple
                                    required
                                    value={selectedEnrollmentIds}
                                    onChange={(event) => setSelectedEnrollmentIds(Array.from(event.target.selectedOptions, (option) => option.value))}
                                    className="w-full min-h-32 border border-gray-300 rounded-lg p-2.5 text-sm"
                                >
                                    {enrollments.map((enrollment) => (
                                        <option key={enrollment.id} value={enrollment.id}>
                                            {enrollment.student.firstName} {enrollment.student.lastName} · Grade {enrollment.schoolGrade?.grade?.level ?? enrollment.schoolGrade?.grade?.name ?? ""} · {enrollment.section?.name ?? "No section"}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-gray-500">Only selected students will see this remedial program in My Support.</p>
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Create Class</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
