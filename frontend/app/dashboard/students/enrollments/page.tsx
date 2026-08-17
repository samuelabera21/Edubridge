"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Users, Plus, Filter, GraduationCap, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";
import Link from "next/link";

export default function StudentEnrollmentsPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    
    // Filtering states
    const [searchQuery, setSearchQuery] = useState("");
    const [filterGrade, setFilterGrade] = useState("ALL");
    const [filterSection, setFilterSection] = useState("ALL");
    const [showFilters, setShowFilters] = useState(false);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasCreatePermission = true; // Bypassing for Admin dashboard

    const loadData = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch Years to find active
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            const active = yearsData.find(y => y.status === "ACTIVE");
            setActiveYear(active || null);

            // 2. Fetch Enrollments
            // In a real app we'd pass ?academicYearId=active.id to filter.
            // Currently our backend handles /student/enrollments returning the enrollments.
            const enrollRes = await fetchApi("/student/enrollments");
            if (!enrollRes.ok) throw new Error("Failed to load enrollments");
            const enrollData = await enrollRes.json();
            
            // Filter enrollments for active year if backend didn't
            if (active) {
                setEnrollments(enrollData.filter((e: any) => e.academicYearId === active.id));
            } else {
                setEnrollments([]);
            }
            
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading && years.length === 0) {
        return <LoadingState message="Loading student enrollments..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    if (!activeYear) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center">
                            <GraduationCap className="w-6 h-6 mr-2 text-[#006b3f]" />
                            Student Enrollments
                        </h1>
                    </div>
                </div>
                <EmptyState 
                    title="No Active Academic Year" 
                    message="You must have an active academic year to view and manage enrollments." 
                />
            </div>
        );
    }

    const uniqueGrades = Array.from(new Set(enrollments.map(e => e.schoolGrade?.grade?.name).filter(Boolean)));
    const uniqueSections = Array.from(new Set(enrollments.map(e => e.section?.name).filter(Boolean)));

    const filteredEnrollments = enrollments.filter(e => {
        const matchesSearch = 
            e.student?.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            `${e.student?.firstName} ${e.student?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGrade = filterGrade === "ALL" || e.schoolGrade?.grade?.name === filterGrade;
        const matchesSection = filterSection === "ALL" || e.section?.name === filterSection;
        
        return matchesSearch && matchesGrade && matchesSection;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <GraduationCap className="w-6 h-6 mr-2 text-[#006b3f]" />
                        Student Enrollments
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Managing enrollments for <span className="font-semibold text-[#006b3f]">{activeYear.name}</span>
                    </p>
                </div>
                {hasCreatePermission && (
                    <Link href="/dashboard/students/register">
                        <Button leftIcon={<Plus className="w-4 h-4" />}>
                            Enroll Student
                        </Button>
                    </Link>
                )}
            </div>

            <Card>
                <CardHeader className="bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
                    <CardTitle>Enrolled Students</CardTitle>
                    <div className="flex space-x-2">
                        <Button 
                            variant={showFilters ? "primary" : "ghost"} 
                            size="sm" 
                            leftIcon={<Filter className="w-4 h-4" />}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            Filter
                        </Button>
                    </div>
                </CardHeader>
                
                {showFilters && (
                    <div className="p-4 bg-white border-b border-gray-100 flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
                            <input 
                                type="text" 
                                placeholder="Search by name or ID..."
                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-[#006b3f] focus:ring-[#006b3f]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Grade</label>
                            <select 
                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-[#006b3f] focus:ring-[#006b3f]"
                                value={filterGrade}
                                onChange={(e) => setFilterGrade(e.target.value)}
                            >
                                <option value="ALL">All Grades</option>
                                {uniqueGrades.map(g => <option key={g as string} value={g as string}>{g as string}</option>)}
                            </select>
                        </div>
                        <div className="w-full md:w-48">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Section</label>
                            <select 
                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-[#006b3f] focus:ring-[#006b3f]"
                                value={filterSection}
                                onChange={(e) => setFilterSection(e.target.value)}
                            >
                                <option value="ALL">All Sections</option>
                                {uniqueSections.map(s => <option key={s as string} value={s as string}>{s as string}</option>)}
                            </select>
                        </div>
                        {(searchQuery || filterGrade !== "ALL" || filterSection !== "ALL") && (
                            <Button variant="ghost" onClick={() => { setSearchQuery(""); setFilterGrade("ALL"); setFilterSection("ALL"); }}>
                                Clear
                            </Button>
                        )}
                    </div>
                )}
                
                <CardContent className="p-0">
                    {filteredEnrollments.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {enrollments.length === 0 ? "No students enrolled for this academic year." : "No students match your filter criteria."}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-y border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Student ID</th>
                                        <th className="px-6 py-3 font-semibold">Name</th>
                                        <th className="px-6 py-3 font-semibold">Grade/Section</th>
                                        <th className="px-6 py-3 font-semibold">Status</th>
                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredEnrollments.map((enrollment) => (
                                        <tr key={enrollment.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {enrollment.student?.studentId || "N/A"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-medium text-gray-900">
                                                    {enrollment.student?.firstName} {enrollment.student?.lastName}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {enrollment.schoolGrade?.grade?.name || "Unassigned"} 
                                                {enrollment.section ? ` - Section ${enrollment.section.name}` : ""}
                                            </td>
                                            <td className="px-6 py-4">
                                                {enrollment.status === "ACTIVE" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <CheckCircle className="w-3 h-3 mr-1" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                        {enrollment.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Link href={`/dashboard/students/${enrollment.studentId}`}>
                                                    <Button variant="ghost" size="sm">Manage</Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
