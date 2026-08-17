"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { ArrowLeft, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function SectionDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const schoolGradeId = params.id as string;
    const sectionId = params.sectionId as string;

    const [gradeData, setGradeData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadDetails = async () => {
            try {
                setLoading(true);
                const res = await fetchApi(`/academic/grades/${schoolGradeId}/details`);
                if (!res.ok) throw new Error("Failed to load grade details");
                const data = await res.json();
                setGradeData(data);
            } catch (err: any) {
                setError(err.message || "An error occurred");
            } finally {
                setLoading(false);
            }
        };
        if (schoolGradeId) {
            loadDetails();
        }
    }, [schoolGradeId]);

    if (loading) return <LoadingState message="Loading section details..." />;
    if (error || !gradeData) return <ErrorState message={error || "Grade not found"} onRetry={() => router.back()} />;

    const activeSection = gradeData.sections.find((s: any) => s.id === sectionId);

    if (!activeSection) {
        return <ErrorState message="Section not found in this grade" onRetry={() => router.back()} />;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.back()}>
                    Back to Sections Overview
                </Button>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <Users className="w-8 h-8 mr-3 text-[#006b3f]" />
                    {gradeData.grade?.name} - Section {activeSection.name}
                </h1>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                    <div className="flex items-center">
                        Academic Year: <span className="font-semibold ml-1 text-gray-900">{gradeData.academicYear?.name}</span>
                    </div>
                    <div className="flex items-center">
                        Enrolled Students: <span className="font-semibold ml-1 text-gray-900">{activeSection.studentEnrollments.length}</span> / {activeSection.capacity || '-'}
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
                    <CardTitle>Enrolled Students</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Student ID</th>
                                    <th className="px-6 py-3 font-semibold">Name</th>
                                    <th className="px-6 py-3 font-semibold">Gender</th>
                                    <th className="px-6 py-3 font-semibold">Status</th>
                                    <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeSection.studentEnrollments.map((enrollment: any) => (
                                    <tr key={enrollment.id} className="hover:bg-gray-50/50 group">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {enrollment.student.studentId}
                                        </td>
                                        <td className="px-6 py-4">
                                            {enrollment.student.firstName} {enrollment.student.lastName}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 capitalize">
                                            {enrollment.student.gender?.toLowerCase() || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                enrollment.status === 'ACTIVE' || enrollment.status === 'ENROLLED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {enrollment.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link href={`/dashboard/students/${enrollment.student.id}`}>
                                                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" leftIcon={<ExternalLink className="w-4 h-4" />}>
                                                    View Profile
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {activeSection.studentEnrollments.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                No students are currently enrolled in this section.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
