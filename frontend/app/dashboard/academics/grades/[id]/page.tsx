"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { ArrowLeft, Users, GraduationCap, LayoutGrid, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function GradeDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const schoolGradeId = params.id as string;

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

    if (loading) return <LoadingState message="Loading grade details..." />;
    if (error || !gradeData) return <ErrorState message={error || "Grade not found"} onRetry={() => router.back()} />;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            <div className="flex items-center justify-between">
                <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.back()}>
                    Back to Grades
                </Button>
            </div>

            {/* HEADER */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <GraduationCap className="w-8 h-8 mr-3 text-[#006b3f]" />
                        {gradeData.grade?.name}
                    </h1>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center">
                            Academic Year: <span className="font-semibold ml-1 text-gray-900">{gradeData.academicYear?.name}</span>
                        </div>
                        <div className="flex items-center">
                            Total Sections: <span className="font-semibold ml-1 text-gray-900">{gradeData.sections?.length || 0}</span>
                        </div>
                        <div className="flex items-center">
                            Total Students: <span className="font-semibold ml-1 text-gray-900">
                                {gradeData.sections.reduce((acc: number, sec: any) => acc + sec.studentEnrollments.length, 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTIONS GRID */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                    <LayoutGrid className="w-5 h-5 mr-2 text-gray-500" />
                    Sections Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {gradeData.sections.map((section: any) => (
                        <Card 
                            key={section.id} 
                            className="transition-all hover:border-gray-300"
                        >
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Section {section.name}</h3>
                                        <p className="text-sm text-gray-500 mt-1">Capacity: {section.capacity || 'N/A'}</p>
                                    </div>
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Users className="w-5 h-5" />
                                    </div>
                                </div>
                                <div className="text-2xl font-bold text-gray-900 mb-4">
                                    {section.studentEnrollments.length} <span className="text-sm font-normal text-gray-500">students</span>
                                </div>
                                <Link href={`/dashboard/academics/grades/${schoolGradeId}/sections/${section.id}`}>
                                    <Button 
                                        variant="outline" 
                                        className="w-full"
                                        leftIcon={<Eye className="w-4 h-4" />}
                                    >
                                        View Students
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                {gradeData.sections.length === 0 && (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">No sections found for this grade.</p>
                    </div>
                )}
            </div>

        </div>
    );
}
