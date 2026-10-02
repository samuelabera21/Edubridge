"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    Building2,
    Users,
    GraduationCap,
    TrendingUp,
    ChevronRight,
    ArrowUpRight,
    Landmark,
    School,
    ShieldAlert,
    RefreshCw,
    Network
} from "lucide-react";
import Link from "next/link";
import HierarchyTreeViewer from "./HierarchyTreeViewer";

export type HierarchyTier = "FEDERAL" | "REGION" | "ZONE" | "WOREDA";

interface GovernanceContext {
    organizationId: string;
    organizationName: string;
    organizationType: HierarchyTier | "SCHOOL";
    lineage: Array<{
        id: string;
        name: string;
        type: string;
        parentId: string | null;
    }>;
    schoolCount: number;
    childUnitType: string | null;
    isDrillDown: boolean;
}

interface GovernanceKPIs {
    totalSchools: number;
    totalStudents: number;
    totalTeachers: number;
    studentTeacherRatio: number;
    attendanceRate: number | null;
    averageAssessmentScore: number | null;
    totalAssessments: number;
}

interface GovernanceStudentsSummary {
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
}

interface GovernanceTeachersSummary {
    total: number;
    active: number;
}

interface GovernanceAttendanceSummary {
    present: number;
    absent: number;
    late: number;
    excused: number;
    totalRecords: number;
    rate: number | null;
}

interface GovernanceAssessmentSummary {
    totalResults: number;
    averageScore: number | null;
}

interface GovernanceChildUnitBreakdown {
    id: string;
    name: string;
    type: string;
    schoolCount: number;
    studentCount: number;
    teacherCount: number;
    attendanceRate: number | null;
    averageAssessmentScore: number | null;
}

interface GovernanceData {
    context: GovernanceContext;
    kpis: GovernanceKPIs;
    students: GovernanceStudentsSummary;
    teachers: GovernanceTeachersSummary;
    attendance: GovernanceAttendanceSummary;
    assessments: GovernanceAssessmentSummary;
    childUnitsBreakdown: GovernanceChildUnitBreakdown[];
}

const TIER_CONFIG: Record<HierarchyTier, {
    title: string;
    subtitle: string;
    badgeColor: string;
    childTierName: string;
    childRoute: string;
}> = {
    FEDERAL: {
        title: "National Education Administration",
        subtitle: "Federal Ministry of Education Overview",
        badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
        childTierName: "Regions",
        childRoute: "/dashboard/region",
    },
    REGION: {
        title: "Regional Education Administration",
        subtitle: "Regional Education Bureau Overview",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
        childTierName: "Zones",
        childRoute: "/dashboard/zone",
    },
    ZONE: {
        title: "Zonal Education Administration",
        subtitle: "Zonal Education Department Overview",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
        childTierName: "Woredas",
        childRoute: "/dashboard/woreda",
    },
    WOREDA: {
        title: "Woreda Education Administration",
        subtitle: "District Education Office Overview",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
        childTierName: "Schools",
        childRoute: "/dashboard",
    },
};

function LoadingState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-16 space-y-4">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-gray-600">{message}</p>
        </div>
    );
}

function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
    return (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-4 max-w-2xl mx-auto my-8">
            <div className="flex items-center space-x-3">
                <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />
                <h3 className="text-lg font-bold">{title}</h3>
            </div>
            <p className="text-sm text-rose-700">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                >
                    Try Again
                </button>
            )}
        </div>
    );
}

export function TierGovernanceDashboardContent({ tier, apiEndpoint }: { tier: HierarchyTier; apiEndpoint: string }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const targetOrgId = searchParams?.get("targetOrgId") || "";

    const [data, setData] = useState<GovernanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const config = TIER_CONFIG[tier];

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const url = targetOrgId
                ? `${apiEndpoint}?targetOrgId=${encodeURIComponent(targetOrgId)}`
                : apiEndpoint;

            const res = await fetchApi(url);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Failed to load ${tier.toLowerCase()} dashboard (${res.status})`);
            }
            const payload = await res.json();
            setData(payload.data);
        } catch (err: any) {
            console.error(`${tier} Dashboard Error:`, err);
            setError(err.message || `Failed to load ${tier.toLowerCase()} governance data`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [tier, apiEndpoint, targetOrgId]);

    if (loading) {
        return <LoadingState message={`Aggregating ${tier.toLowerCase()} administrative metrics...`} />;
    }

    if (error || !data) {
        return (
            <ErrorState
                title={`${config.title} Unavailable`}
                message={error || "Could not retrieve administrative data."}
                onRetry={loadData}
            />
        );
    }

    const { context, kpis, students, childUnitsBreakdown = [] } = data;

    // Student gender calculation with safe defaults
    const totalStudents = students?.total || kpis?.totalStudents || 0;
    const maleCount = students?.byGender?.male || 0;
    const femaleCount = students?.byGender?.female || 0;
    const otherCount = students?.byGender?.other || 0;
    const denominator = totalStudents > 0 ? totalStudents : 1;
    const malePct = totalStudents > 0 ? Math.round((maleCount / denominator) * 100) : 0;
    const femalePct = totalStudents > 0 ? Math.round((femaleCount / denominator) * 100) : 0;
    const otherPct = totalStudents > 0 ? Math.max(0, 100 - malePct - femalePct) : 0;
    const byGrade = students?.byGrade || [];

    // Handle drill-down target URL
    const getChildDrillDownUrl = (child: GovernanceChildUnitBreakdown) => {
        if (child.type === "SCHOOL") {
            return `/dashboard?schoolId=${child.id}`;
        }
        if (child.type === "REGION") {
            return `/dashboard/region?targetOrgId=${child.id}`;
        }
        if (child.type === "ZONE") {
            return `/dashboard/zone?targetOrgId=${child.id}`;
        }
        if (child.type === "WOREDA") {
            return `/dashboard/woreda?targetOrgId=${child.id}`;
        }
        return `/dashboard/${child.type.toLowerCase()}?targetOrgId=${child.id}`;
    };

    const currentTab = searchParams?.get("tab") || "overview";

    return (
        <div className="space-y-6 pb-12">
            {/* Header with Lineage & Context */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                {/* Lineage Breadcrumb */}
                {context?.lineage && context.lineage.length > 0 && (
                    <nav aria-label="Lineage Breadcrumbs" className="flex items-center flex-wrap gap-2 text-xs text-gray-500 mb-1 select-none">
                        <Link
                            href={`/dashboard/${tier.toLowerCase()}`}
                            className="hover:text-blue-600 flex items-center gap-1 font-semibold text-gray-700"
                        >
                            <Landmark className="w-3.5 h-3.5 text-blue-600" />
                            <span>{tier} Scope Root</span>
                        </Link>

                        {context.lineage.map((unit, index) => {
                            const isLast = index === context.lineage.length - 1;
                            const isCurrent = unit.id === context.organizationId;

                            return (
                                <div key={unit.id} className="flex items-center gap-2">
                                    <ChevronRight className="w-3 h-3 text-gray-400" />
                                    {isLast || isCurrent ? (
                                        <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
                                            {unit.name} ({unit.type})
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                if (unit.type === "SCHOOL") {
                                                    router.push(`/dashboard?schoolId=${unit.id}`);
                                                } else {
                                                    router.push(`/dashboard/${unit.type.toLowerCase()}?targetOrgId=${unit.id}`);
                                                }
                                            }}
                                            className="hover:text-blue-600 hover:underline text-gray-600 transition-colors cursor-pointer"
                                        >
                                            {unit.name}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-gray-900">{context?.organizationName || "Administrative Scope"}</h1>
                            <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${config.badgeColor}`}>
                                {context?.organizationType || tier}
                            </span>
                            {context?.isDrillDown && (
                                <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-md">
                                    Filtered Sub-Scope
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{config.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => {
                                    const base = `/dashboard/${tier.toLowerCase()}`;
                                    const q = targetOrgId ? `?targetOrgId=${targetOrgId}` : "";
                                    router.push(`${base}${q}`);
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                    currentTab !== "hierarchy"
                                        ? "bg-white text-gray-900 shadow-xs"
                                        : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                Overview
                            </button>
                            <button
                                onClick={() => {
                                    const base = `/dashboard/${tier.toLowerCase()}`;
                                    const q = targetOrgId ? `?targetOrgId=${targetOrgId}&tab=hierarchy` : `?tab=hierarchy`;
                                    router.push(`${base}${q}`);
                                }}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                                    currentTab === "hierarchy"
                                        ? "bg-white text-blue-700 shadow-xs"
                                        : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                <Network className="w-3.5 h-3.5" />
                                <span>Hierarchy Tree</span>
                            </button>
                        </div>

                        {context?.isDrillDown && (
                            <button
                                onClick={() => router.push(`/dashboard/${tier.toLowerCase()}`)}
                                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
                            >
                                Reset to My Scope
                            </button>
                        )}
                        <button
                            onClick={loadData}
                            className="p-2 border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                            title="Refresh Data"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Hierarchy Tree Tab View */}
            {currentTab === "hierarchy" ? (
                <HierarchyTreeViewer rootOrgId={targetOrgId || context?.organizationId} userTier={tier} />
            ) : (
                <>
                    {/* Top KPI Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Schools */}
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Schools Monitored</span>
                                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <School className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{(kpis?.totalSchools ?? 0).toLocaleString()}</div>
                            <p className="text-[11px] text-gray-500">Across authorized {tier.toLowerCase()} boundaries</p>
                        </div>

                        {/* Total Students */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Enrolled Students</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{(kpis?.totalStudents ?? 0).toLocaleString()}</div>
                    <p className="text-[11px] text-gray-500">Active academic year registrations</p>
                </div>

                {/* Active Teachers & Ratio */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Teachers</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <GraduationCap className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-gray-900">{(kpis?.totalTeachers ?? 0).toLocaleString()}</span>
                        <span className="text-xs text-gray-500 font-medium">({kpis?.studentTeacherRatio ?? 0}:1 Ratio)</span>
                    </div>
                    <p className="text-[11px] text-gray-500">Student-to-Teacher Ratio</p>
                </div>

                {/* Attendance & Assessments */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendance Rate</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-gray-900">
                            {kpis?.attendanceRate !== null && kpis?.attendanceRate !== undefined ? `${kpis.attendanceRate}%` : "—"}
                        </span>
                        {kpis?.averageAssessmentScore !== null && kpis?.averageAssessmentScore !== undefined && (
                            <span className="text-xs text-gray-500 font-medium">
                                ({kpis.averageAssessmentScore}% Avg Score)
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                        {(kpis?.totalAssessments ?? 0) > 0 ? `${kpis.totalAssessments} records assessed` : "No active attendance logs"}
                    </p>
                </div>
            </div>

            {/* Student Demographics & Grade Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gender Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-900">Gender Demographics</h2>
                        <Users className="w-4 h-4 text-gray-400" />
                    </div>

                    <div className="space-y-3">
                        <div className="w-full bg-gray-100 rounded-full h-3 flex overflow-hidden">
                            <div style={{ width: `${malePct}%` }} className="bg-blue-500 h-full" title={`Male: ${malePct}%`} />
                            <div style={{ width: `${femalePct}%` }} className="bg-pink-500 h-full" title={`Female: ${femalePct}%`} />
                            <div style={{ width: `${otherPct}%` }} className="bg-gray-400 h-full" title={`Other: ${otherPct}%`} />
                        </div>

                        <div className="grid grid-cols-3 text-center gap-2 pt-2">
                            <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                                <p className="text-[10px] uppercase font-bold text-blue-600">Male</p>
                                <p className="text-base font-bold text-gray-900">{maleCount}</p>
                                <p className="text-[10px] text-gray-500">{malePct}%</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-pink-50/60 border border-pink-100">
                                <p className="text-[10px] uppercase font-bold text-pink-600">Female</p>
                                <p className="text-base font-bold text-gray-900">{femaleCount}</p>
                                <p className="text-[10px] text-gray-500">{femalePct}%</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                                <p className="text-[10px] uppercase font-bold text-gray-600">Other/Unset</p>
                                <p className="text-base font-bold text-gray-900">{otherCount}</p>
                                <p className="text-[10px] text-gray-500">{otherPct}%</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grade Distribution */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-900">Grade Level Distribution</h2>
                        <span className="text-xs text-gray-500">{byGrade.length} Grade Levels</span>
                    </div>

                    {byGrade.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500">
                            No enrolled student grade distribution found for active academic years.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto pr-1">
                            {byGrade.map((g) => (
                                <div key={g.gradeId} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 text-center space-y-0.5">
                                    <p className="text-[11px] font-bold text-gray-700 truncate">{g.gradeName}</p>
                                    <p className="text-sm font-extrabold text-blue-700">{g.studentCount}</p>
                                    <p className="text-[9px] text-gray-400">Students</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Child Units Breakdown Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">
                            Subordinate {config.childTierName} ({childUnitsBreakdown.length})
                        </h2>
                        <p className="text-xs text-gray-500">
                            Drill-down into subordinate {config.childTierName.toLowerCase()} to inspect regional and localized performance.
                        </p>
                    </div>
                </div>

                {childUnitsBreakdown.length === 0 ? (
                    <div className="p-8 text-center space-y-2">
                        <p className="text-sm font-semibold text-gray-700">No Subordinate Units Registered</p>
                        <p className="text-xs text-gray-500 max-w-md mx-auto">
                            Subordinate {config.childTierName.toLowerCase()} must be assigned under this administrative boundary.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="py-3.5 px-4">{config.childTierName.slice(0, -1)} Name</th>
                                    <th className="py-3.5 px-4">Tier Type</th>
                                    <th className="py-3.5 px-4 text-center">Schools</th>
                                    <th className="py-3.5 px-4 text-center">Students</th>
                                    <th className="py-3.5 px-4 text-center">Teachers</th>
                                    <th className="py-3.5 px-4 text-center">Attendance</th>
                                    <th className="py-3.5 px-4 text-center">Avg Score</th>
                                    <th className="py-3.5 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                                {childUnitsBreakdown.map((child) => (
                                    <tr key={child.id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="py-3 px-4 font-bold text-gray-900 flex items-center space-x-2">
                                            {child.type === "SCHOOL" ? (
                                                <School className="w-4 h-4 text-blue-500 shrink-0" />
                                            ) : (
                                                <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                                            )}
                                            <span className="truncate max-w-xs">{child.name}</span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                                                {child.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center font-semibold">{child.schoolCount}</td>
                                        <td className="py-3 px-4 text-center">{child.studentCount.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-center">{child.teacherCount.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-center">
                                            {child.attendanceRate !== null ? (
                                                <span className={`font-semibold ${child.attendanceRate >= 85 ? "text-emerald-600" : "text-amber-600"}`}>
                                                    {child.attendanceRate}%
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            {child.averageAssessmentScore !== null ? (
                                                <span className="font-semibold text-blue-600">
                                                    {child.averageAssessmentScore}%
                                                </span>
                                            ) : (
                                                "—"
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                onClick={() => router.push(getChildDrillDownUrl(child))}
                                                className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                                            >
                                                <span>{child.type === "SCHOOL" ? "View School" : "Drill Down"}</span>
                                                <ArrowUpRight className="w-3 h-3" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
                </>
            )}
        </div>
    );
}

export default function TierGovernanceDashboard({ tier, apiEndpoint }: { tier: HierarchyTier; apiEndpoint: string }) {
    return (
        <Suspense fallback={<LoadingState message={`Loading ${tier.toLowerCase()} governance dashboard...`} />}>
            <TierGovernanceDashboardContent tier={tier} apiEndpoint={apiEndpoint} />
        </Suspense>
    );
}
