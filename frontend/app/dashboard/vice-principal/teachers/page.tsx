"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import { Users, Briefcase } from "lucide-react";

export default function TeachingMonitoringPage() {
    const [teachers, setTeachers] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const [teachersRes, assignmentsRes] = await Promise.all([
                    fetchApi("/vice-principal/teachers"),
                    fetchApi("/vice-principal/teachers/assignments")
                ]);

                if (teachersRes.ok) {
                    const data = await teachersRes.json();
                    setTeachers(data.teachers || data || []);
                }

                if (assignmentsRes.ok) {
                    const data = await assignmentsRes.json();
                    setAssignments(data.assignments || data || []);
                }
            } catch (err) {
                console.error("Failed to load teaching data:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadData();
    }, []);

    if (loading) {
        return <div className="animate-pulse">Loading teaching assignments...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Teaching Monitoring</h1>
                    <p className="text-gray-500">Monitor teacher assignments, workloads, and schedules.</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Total Teachers: {teachers.length}</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3 bg-gray-50">
                    <Briefcase className="w-5 h-5 text-gray-500" />
                    <h2 className="font-semibold text-gray-900">Teacher Assignments & Workload</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-6 py-4">Teacher Name</th>
                                <th className="px-6 py-4">Employee ID</th>
                                <th className="px-6 py-4">Assigned Subjects</th>
                                <th className="px-6 py-4 text-center">Classes Count</th>
                                <th className="px-6 py-4 text-center">Workload Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {teachers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No teachers registered yet.
                                    </td>
                                </tr>
                            ) : (
                                teachers.map((teacher) => {
                                    // Calculate workload for this teacher based on assignments
                                    const teacherAssignments = assignments.filter(a => a.teacherId === teacher.id);
                                    
                                    // Extract unique subjects
                                    const subjects = Array.from(new Set(teacherAssignments.map(a => a.subject?.name).filter(Boolean)));
                                    const classCount = teacherAssignments.length;
                                    
                                    // Simple logic: > 5 classes is high workload, else normal
                                    const isHighWorkload = classCount > 5;
                                    
                                    return (
                                        <tr key={teacher.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{teacher.firstName} {teacher.lastName}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {teacher.employeeId || "N/A"}
                                            </td>
                                            <td className="px-6 py-4">
                                                {subjects.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {subjects.map((sub: any, idx: number) => (
                                                            <span key={idx} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded">
                                                                {sub}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm italic">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium">
                                                {classCount}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {classCount === 0 ? (
                                                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">Idle</span>
                                                ) : isHighWorkload ? (
                                                    <span className="bg-rose-100 text-rose-700 text-xs px-2 py-1 rounded-full font-medium">High</span>
                                                ) : (
                                                    <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium">Normal</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
