"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { 
    Building2, 
    Users, 
    GraduationCap, 
    Layers, 
    CalendarCheck, 
    CheckCircle2, 
    ChevronRight, 
    RefreshCw, 
    ArrowRight, 
    ShieldAlert, 
    AlertCircle,
    BarChart3,
    Compass,
    Sparkles,
    Landmark,
    School
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

interface GovernanceData {
    context: {
        organizationId: string;
        organizationName: string;
        organizationType: "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";
        lineage: Array<{
            id: string;
            name: string;
            type: string;
            parentId: string | null;
        }>;
        schoolCount: number;
        childUnitType: string | null;
        isDrillDown: boolean;
    };
    kpis: {
        totalSchools: number;
        totalStudents: number;
        totalTeachers: number;
        studentTeacherRatio: number;
        attendanceRate: number | null;
        averageAssessmentScore: number | null;
        totalAssessments: number;
    };
    students: {
        total: number;
        byGender: {
            male: number;
            female: number;
            other: number;
        };
        byGrade: Array<{
            gradeId: string;
            gradeName: string;
            level: number;
            studentCount: number;
        }>;
    };
    teachers: {
        total: number;
        active: number;
    };
    attendance: {
        present: number;
        absent: number;
        late: number;
        excused: number;
        totalRecords: number;
        rate: number | null;
    };
    assessments: {
        totalResults: number;
        averageScore: number | null;
    };
    childUnitsBreakdown: Array<{
        id: string;
        name: string;
        type: string;
        schoolCount: number;
        studentCount: number;
        teacherCount: number;
        attendanceRate: number | null;
        averageAssessmentScore: number | null;
    }>;
}

function GovernanceDashboardContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const targetOrgId = searchParams?.get("targetOrgId") || undefined;

    const [data, setData] = useState<GovernanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = targetOrgId 
                ? `/governance/dashboard?targetOrgId=${encodeURIComponent(targetOrgId)}`
                : "/governance/dashboard";
            
            const res = await fetchApi(endpoint);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Failed to load governance dashboard (${res.status})`);
            }
            const payload = await res.json();
            setData(payload.data);
        } catch (err: any) {
            console.error("Governance Dashboard Error:", err);
            setError(err.message || "Failed to load governance dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [targetOrgId]);

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <LoadingState message="Aggregating hierarchical governance metrics..." />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <ErrorState 
                    title="Governance Overview Unavailable" 
                    message={error || "An error occurred while aggregating data for this organizational unit."} 
                    onRetry={loadData} 
                />
            </div>
        );
    }

    const { context, kpis, students, teachers, attendance, assessments, childUnitsBreakdown } = data;

    // Determine Dynamic Title based on Organization Tier
    const tierTitleMap: Record<string, string> = {
        FEDERAL: "National Education Governance Overview",
        REGION: "Regional Education Governance Overview",
        ZONE: "Zonal Education Governance Overview",
        WOREDA: "District Education Governance Overview",
        SCHOOL: "Institutional Governance Overview",
    };
    const heroTitle = tierTitleMap[context.organizationType] || "Education Governance Overview";

    const childTypeLabelMap: Record<string, string> = {
        REGION: "Regions",
        ZONE: "Zones",
        WOREDA: "Woredas / Districts",
        SCHOOL: "Schools",
    };
    const childPluralLabel = context.childUnitType ? (childTypeLabelMap[context.childUnitType] || "Sub-Units") : "Child Units";

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
            {/* 1. Header & Lineage Breadcrumb */}
            <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-50/60 to-transparent rounded-full pointer-events-none -mr-20 -mt-20" />
                
                {/* Lineage Trail */}
                {context.lineage && context.lineage.length > 0 && (
                    <nav aria-label="Governance Lineage" className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mb-4 select-none">
                        <Link 
                            href="/dashboard/governance" 
                            className="flex items-center gap-1.5 font-medium hover:text-[#4085b3] transition-colors text-gray-600"
                            title="Return to Home Scope"
                        >
                            <Compass className="w-3.5 h-3.5 text-[#4085b3]" />
                            <span>My Scope</span>
                        </Link>
                        
                        {context.lineage.slice().reverse().map((unit, index) => {
                            const isCurrent = unit.id === context.organizationId;
                            return (
                                <div key={unit.id} className="flex items-center gap-2">
                                    <ChevronRight className="w-3 h-3 text-gray-300" />
                                    {isCurrent ? (
                                        <span className="font-bold text-gray-900 bg-blue-50 text-[#4085b3] px-2 py-0.5 rounded-md">
                                            {unit.name} ({unit.type})
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => router.push(`/dashboard/governance?targetOrgId=${unit.id}`)}
                                            className="hover:text-[#4085b3] transition-colors text-gray-600 hover:underline font-medium"
                                        >
                                            {unit.name}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#4085b3]/10 text-[#4085b3] tracking-wide uppercase">
                                <Landmark className="w-3.5 h-3.5" />
                                {context.organizationType} TIER
                            </span>
                            {context.isDrillDown && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/60">
                                    Drill-Down View
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                            {context.organizationName}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {heroTitle} • Managing {kpis.totalSchools} educational institution{kpis.totalSchools === 1 ? "" : "s"}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {context.isDrillDown && (
                            <button
                                onClick={() => router.push("/dashboard/governance")}
                                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all shadow-sm"
                            >
                                Reset to Home Scope
                            </button>
                        )}
                        <button 
                            onClick={loadData}
                            className="p-2.5 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all border border-gray-200/60"
                            title="Refresh Data"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Key Performance Indicators (KPI Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Schools */}
                <Card className="hover:shadow-md transition-shadow border-l-4 border-l-[#4085b3]">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Schools & Institutions</p>
                            <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                                {kpis.totalSchools.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Active under hierarchy</p>
                        </div>
                        <div className="p-3 bg-blue-50 text-[#4085b3] rounded-xl">
                            <School className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                {/* Total Students */}
                <Card className="hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled Students</p>
                            <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                                {kpis.totalStudents.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Active current year</p>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                            <Users className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                {/* Total Teachers */}
                <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Teachers</p>
                            <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                                {kpis.totalTeachers.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {kpis.studentTeacherRatio > 0 ? `${kpis.studentTeacherRatio}:1 Student Ratio` : "No ratio data"}
                            </p>
                        </div>
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                            <GraduationCap className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                {/* Attendance Rate */}
                <Card className="hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Attendance</p>
                            <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                                {kpis.attendanceRate !== null ? `${kpis.attendanceRate}%` : "N/A"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {attendance.totalRecords > 0 ? `${attendance.totalRecords.toLocaleString()} session records` : "No records recorded"}
                            </p>
                        </div>
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                            <CalendarCheck className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Empty Data Notice if 0 schools */}
            {kpis.totalSchools === 0 && (
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-8 text-center max-w-2xl mx-auto space-y-3">
                    <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">No Educational Institutions Found</h3>
                    <p className="text-xs text-gray-600">
                        There are currently no schools registered under <strong>{context.organizationName}</strong>. 
                        Subordinate schools must be created or assigned under this administrative boundary to populate governance analytics.
                    </p>
                </div>
            )}

            {/* 4. Student Demographics & Grade Breakdown */}
            {kpis.totalSchools > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Gender Breakdown */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Gender Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {students.total > 0 ? (
                                <>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-blue-600 font-semibold">Male Students</span>
                                            <span className="text-gray-700">
                                                {students.byGender.male.toLocaleString()} ({Math.round((students.byGender.male / students.total) * 100)}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className="bg-blue-500 h-2.5 rounded-full transition-all duration-500" 
                                                style={{ width: `${(students.byGender.male / students.total) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-pink-600 font-semibold">Female Students</span>
                                            <span className="text-gray-700">
                                                {students.byGender.female.toLocaleString()} ({Math.round((students.byGender.female / students.total) * 100)}%)
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className="bg-pink-500 h-2.5 rounded-full transition-all duration-500" 
                                                style={{ width: `${(students.byGender.female / students.total) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                                        <span>Total Enrolled</span>
                                        <span className="font-bold text-gray-900">{students.total.toLocaleString()}</span>
                                    </div>
                                </>
                            ) : (
                                <p className="text-xs text-gray-400 py-6 text-center">No student enrollment data available.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Grade Distribution */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Enrollment by Grade Level</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {students.byGrade.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {students.byGrade.map((g) => (
                                        <div key={g.gradeId} className="bg-gray-50/70 border border-gray-100 rounded-xl p-3 text-center">
                                            <span className="text-xs font-medium text-gray-500 block truncate">{g.gradeName}</span>
                                            <span className="text-lg font-bold text-gray-900 mt-0.5 block">{g.studentCount.toLocaleString()}</span>
                                            <span className="text-[10px] text-gray-400 block">students</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 py-6 text-center">No grade-level enrollment breakdown available.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 5. Sub-Unit Breakdown Table & Drill-Down */}
            {childUnitsBreakdown.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{childPluralLabel} Breakdown & Overview</CardTitle>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Subordinate administrative units under {context.organizationName}
                            </p>
                        </div>
                        <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg">
                            {childUnitsBreakdown.length} {childPluralLabel}
                        </span>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3 px-6">Unit Name</th>
                                        <th className="py-3 px-6">Type</th>
                                        <th className="py-3 px-6 text-center">Schools</th>
                                        <th className="py-3 px-6 text-center">Students</th>
                                        <th className="py-3 px-6 text-center">Teachers</th>
                                        <th className="py-3 px-6 text-center">Attendance</th>
                                        <th className="py-3 px-6 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100/70">
                                    {childUnitsBreakdown.map((child) => (
                                        <tr key={child.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="py-4 px-6 font-semibold text-gray-900">
                                                {child.name}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 text-gray-700">
                                                    {child.type}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center font-medium">
                                                {child.schoolCount.toLocaleString()}
                                            </td>
                                            <td className="py-4 px-6 text-center font-medium">
                                                {child.studentCount.toLocaleString()}
                                            </td>
                                            <td className="py-4 px-6 text-center font-medium">
                                                {child.teacherCount.toLocaleString()}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                {child.attendanceRate !== null ? (
                                                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                                        child.attendanceRate >= 90 ? "bg-emerald-50 text-emerald-700" :
                                                        child.attendanceRate >= 75 ? "bg-amber-50 text-amber-700" :
                                                        "bg-rose-50 text-rose-700"
                                                    }`}>
                                                        {child.attendanceRate}%
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                {child.type !== "SCHOOL" ? (
                                                    <button
                                                        onClick={() => router.push(`/dashboard/governance?targetOrgId=${child.id}`)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-[#4085b3] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                    >
                                                        <span>Drill Down</span>
                                                        <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                ) : (
                                                    <span className="text-[11px] text-gray-400 font-medium">
                                                        School Unit
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function GovernanceDashboardPage() {
    return (
        <Suspense fallback={
            <div className="p-8 max-w-7xl mx-auto">
                <LoadingState message="Loading governance overview..." />
            </div>
        }>
            <GovernanceDashboardContent />
        </Suspense>
    );
}
