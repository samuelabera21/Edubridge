"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    FileSpreadsheet,
    Download,
    Filter,
    RefreshCw,
    Building2,
    Layers,
    MapPin,
    School,
    Users,
    GraduationCap,
    BookOpen,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    ArrowLeft,
    Search,
    AlertCircle,
    CheckCircle2,
    ArrowUpDown,
    CornerDownRight,
    TrendingUp,
    Award,
    Activity,
    UserCheck,
    PieChart
} from "lucide-react";
import { fetchApi } from "../../lib/api";

export interface HierarchicalReportsViewProps {
    tierName?: string;
    tierType?: "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";
    initialTargetOrgId?: string;
}

interface AccessibleUnit {
    id: string;
    name: string;
    type: "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";
    parentId: string | null;
    parentName: string | null;
}

interface AcademicYearOption {
    id: string;
    name: string;
    status: string;
}

interface ReportBreakdownColumn {
    key: string;
    label: string;
    align?: "left" | "center" | "right";
    isNumeric?: boolean;
}

interface ReportBreakdownRow {
    id: string;
    name: string;
    type?: string;
    zonesCount?: number;
    woredasCount?: number;
    schoolsCount?: number;
    maleStudents?: number;
    femaleStudents?: number;
    studentsCount?: number;
    maleTeachers?: number;
    femaleTeachers?: number;
    teachersCount?: number;
    ptr?: number | string;
    gradesCount?: number;
    sectionsCount?: number;
    status?: string;
    establishedYear?: number | string | null;
    [key: string]: any;
}

interface EducationSummaryReportData {
    reportType: "EDUCATION_SUMMARY";
    title: string;
    generatedAt: string;
    generatedBy: {
        userId: string;
        organizationId: string;
        organizationName: string;
        organizationType: string;
    };
    targetOrganization: {
        id: string;
        name: string;
        type: "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";
        parentId: string | null;
    };
    lineage: Array<{ id: string; name: string; type: string }>;
    scopeMode: "CURRENT_AND_DESCENDANTS" | "CURRENT_ONLY";
    academicYear: {
        id: string;
        name: string;
        status: string;
    } | null;
    metrics: {
        regionsCount: number;
        zonesCount: number;
        woredasCount: number;
        schoolsCount: number;
        totalStudents: number;
        maleStudents: number;
        femaleStudents: number;
        totalTeachers: number;
        maleTeachers: number;
        femaleTeachers: number;
        pupilTeacherRatio: number | string;
        genderParityIndex: number;
        gradesCount: number;
        sectionsCount: number;
    };
    analytics?: {
        gender: {
            maleStudents: number;
            femaleStudents: number;
            totalStudents: number;
            femaleStudentPct: number;
            genderParityIndex: number;
            maleTeachers: number;
            femaleTeachers: number;
            totalTeachers: number;
            femaleTeacherPct: number;
        };
        staffing: {
            pupilTeacherRatio: number | string;
            totalAssignments: number;
            qualifications: {
                doctorate: number;
                masters: number;
                bachelors: number;
                diploma: number;
                certificate: number;
                other: number;
            };
        };
        studentRetention: {
            enrolled: number;
            active: number;
            transferred: number;
            withdrawn: number;
            droppedOut: number;
            graduated: number;
        };
    };
    breakdown: {
        level: "REGION" | "ZONE" | "WOREDA" | "SCHOOL" | "GRADE_SECTION";
        title: string;
        columns: ReportBreakdownColumn[];
        rows: ReportBreakdownRow[];
    };
}

export default function HierarchicalReportsView({
    tierName = "Institution",
    tierType = "FEDERAL",
    initialTargetOrgId
}: HierarchicalReportsViewProps) {
    // Scope & Options state
    const [accessibleUnits, setAccessibleUnits] = useState<AccessibleUnit[]>([]);
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [userScopeOrg, setUserScopeOrg] = useState<{ id: string; name: string; type: string } | null>(null);

    // Filter controls state
    const [selectedOrgId, setSelectedOrgId] = useState<string>(initialTargetOrgId || "");
    const [targetLevelCategory, setTargetLevelCategory] = useState<string>("FEDERAL");
    const [filterRegionId, setFilterRegionId] = useState<string>("");
    const [filterZoneId, setFilterZoneId] = useState<string>("");
    const [filterWoredaId, setFilterWoredaId] = useState<string>("");
    const [filterSchoolId, setFilterSchoolId] = useState<string>("");

    const [scopeMode, setScopeMode] = useState<"CURRENT_AND_DESCENDANTS" | "CURRENT_ONLY">("CURRENT_AND_DESCENDANTS");
    const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>("");
    const [showFilters, setShowFilters] = useState<boolean>(false);

    // Report data & loading state
    const [reportData, setReportData] = useState<EducationSummaryReportData | null>(null);
    const [loadingScope, setLoadingScope] = useState<boolean>(true);
    const [generating, setGenerating] = useState<boolean>(false);
    const [exportingCsv, setExportingCsv] = useState<boolean>(false);
    const [exportingExcel, setExportingExcel] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Table search & sort state
    const [tableSearch, setTableSearch] = useState<string>("");
    const [sortColumn, setSortColumn] = useState<string>("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    // Memoized unit lists by tier
    const regionsList = useMemo(() => {
        return accessibleUnits.filter(u => u.type === "REGION");
    }, [accessibleUnits]);

    const zonesList = useMemo(() => {
        if (!filterRegionId) {
            return accessibleUnits.filter(u => u.type === "ZONE");
        }
        return accessibleUnits.filter(u => u.type === "ZONE" && u.parentId === filterRegionId);
    }, [accessibleUnits, filterRegionId]);

    const woredasList = useMemo(() => {
        if (filterZoneId) {
            return accessibleUnits.filter(u => u.type === "WOREDA" && u.parentId === filterZoneId);
        }
        if (filterRegionId) {
            const validZoneIds = new Set(zonesList.map(z => z.id));
            return accessibleUnits.filter(u => u.type === "WOREDA" && u.parentId && validZoneIds.has(u.parentId));
        }
        return accessibleUnits.filter(u => u.type === "WOREDA");
    }, [accessibleUnits, filterZoneId, filterRegionId, zonesList]);

    const schoolsList = useMemo(() => {
        if (filterWoredaId) {
            return accessibleUnits.filter(u => u.type === "SCHOOL" && u.parentId === filterWoredaId);
        }
        if (filterZoneId) {
            const validWoredaIds = new Set(woredasList.map(w => w.id));
            return accessibleUnits.filter(u => u.type === "SCHOOL" && u.parentId && validWoredaIds.has(u.parentId));
        }
        return accessibleUnits.filter(u => u.type === "SCHOOL");
    }, [accessibleUnits, filterWoredaId, filterZoneId, woredasList]);

    // Synchronize cascading filters when target organization changes
    const syncFiltersFromOrgId = (orgId: string, units: AccessibleUnit[] = accessibleUnits) => {
        if (!orgId) return;
        const target = units.find(u => u.id === orgId);
        if (!target) return;

        if (target.type === "FEDERAL") {
            setTargetLevelCategory("FEDERAL");
            setFilterRegionId("");
            setFilterZoneId("");
            setFilterWoredaId("");
            setFilterSchoolId("");
        } else if (target.type === "REGION") {
            setTargetLevelCategory("REGION");
            setFilterRegionId(target.id);
            setFilterZoneId("");
            setFilterWoredaId("");
            setFilterSchoolId("");
        } else if (target.type === "ZONE") {
            setTargetLevelCategory("ZONE");
            setFilterRegionId(target.parentId || "");
            setFilterZoneId(target.id);
            setFilterWoredaId("");
            setFilterSchoolId("");
        } else if (target.type === "WOREDA") {
            setTargetLevelCategory("WOREDA");
            const parentZone = units.find(u => u.id === target.parentId);
            setFilterRegionId(parentZone?.parentId || "");
            setFilterZoneId(target.parentId || "");
            setFilterWoredaId(target.id);
            setFilterSchoolId("");
        } else if (target.type === "SCHOOL") {
            setTargetLevelCategory("SCHOOL");
            const parentWor = units.find(u => u.id === target.parentId);
            const parentZon = parentWor ? units.find(u => u.id === parentWor.parentId) : null;
            setFilterRegionId(parentZon?.parentId || "");
            setFilterZoneId(parentWor?.parentId || "");
            setFilterWoredaId(target.parentId || "");
            setFilterSchoolId(target.id);
        }
    };

    // Initialize reporting scope
    useEffect(() => {
        let isMounted = true;

        async function initScope() {
            setLoadingScope(true);
            setError(null);
            try {
                const res = await fetchApi("/hierarchical-reports/scope");
                if (!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    throw new Error(errJson.error || "Failed to fetch reporting scope");
                }

                const raw = await res.json();
                const data = raw?.data || raw;
                if (isMounted && data) {
                    setAccessibleUnits(data.accessibleOrganizations || []);
                    setAcademicYears(data.academicYears || []);
                    if (data.userScope) {
                        setUserScopeOrg({
                            id: data.userScope.currentOrganizationId,
                            name: data.userScope.currentOrganizationName,
                            type: data.userScope.currentOrganizationType
                        });

                        const activeAy = data.academicYears?.find((y: any) => y.status === "ACTIVE");
                        const defaultAyId = activeAy ? activeAy.id : "";
                        setSelectedAcademicYearId(defaultAyId);

                        const initialOrg = initialTargetOrgId || data.userScope.currentOrganizationId;
                        setSelectedOrgId(initialOrg);
                        syncFiltersFromOrgId(initialOrg, data.accessibleOrganizations);

                        generateReport(initialOrg, "CURRENT_AND_DESCENDANTS", defaultAyId);
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || "Failed to initialize reporting scope.");
                }
            } finally {
                if (isMounted) {
                    setLoadingScope(false);
                }
            }
        }

        initScope();

        return () => {
            isMounted = false;
        };
    }, []);

    // Generate report
    const generateReport = async (
        targetOrgIdToUse?: string,
        scopeModeToUse?: "CURRENT_AND_DESCENDANTS" | "CURRENT_ONLY",
        ayIdToUse?: string
    ) => {
        const orgId = targetOrgIdToUse || selectedOrgId;
        const mode = scopeModeToUse || scopeMode;
        const ayId = ayIdToUse !== undefined ? ayIdToUse : selectedAcademicYearId;

        if (!orgId) return;

        setGenerating(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();
            queryParams.set("targetOrganizationId", orgId);
            queryParams.set("scopeMode", mode);
            if (ayId) {
                queryParams.set("academicYearId", ayId);
            }

            const res = await fetchApi(`/hierarchical-reports/education-summary?${queryParams.toString()}`);
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error || "Failed to generate report.");
            }

            const raw = await res.json();
            const data: EducationSummaryReportData = raw?.data || raw;
            setReportData(data);
            if (data?.targetOrganization?.id) {
                setSelectedOrgId(data.targetOrganization.id);
                syncFiltersFromOrgId(data.targetOrganization.id);
            }
        } catch (err: any) {
            setError(err.message || "Error generating report.");
        } finally {
            setGenerating(false);
        }
    };

    // Handle Drill-down navigation by clicking on table row
    const handleDrillDownRow = (rowOrgId: string) => {
        if (!rowOrgId) return;
        setSelectedOrgId(rowOrgId);
        syncFiltersFromOrgId(rowOrgId);
        generateReport(rowOrgId, scopeMode, selectedAcademicYearId);
    };

    // Handle exports
    const handleExport = async (format: "csv" | "excel") => {
        if (!reportData) return;

        if (format === "csv") setExportingCsv(true);
        else setExportingExcel(true);

        try {
            const queryParams = new URLSearchParams();
            queryParams.set("targetOrganizationId", reportData.targetOrganization.id);
            queryParams.set("scopeMode", reportData.scopeMode);
            queryParams.set("format", format);
            if (reportData.academicYear?.id) {
                queryParams.set("academicYearId", reportData.academicYear.id);
            }

            const downloadUrl = `/api/hierarchical-reports/education-summary/export?${queryParams.toString()}`;
            window.open(downloadUrl, "_blank");
        } catch (err: any) {
            setError(`Export failed: ${err.message}`);
        } finally {
            setExportingCsv(false);
            setExportingExcel(false);
        }
    };

    // Sort handler
    const handleSort = (columnKey: string) => {
        if (sortColumn === columnKey) {
            setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortColumn(columnKey);
            setSortDirection("asc");
        }
    };

    // Filter and Sort rows
    const filteredBreakdownRows = useMemo(() => {
        if (!reportData?.breakdown?.rows) return [];

        let result = [...reportData.breakdown.rows];

        if (tableSearch.trim()) {
            const term = tableSearch.toLowerCase().trim();
            result = result.filter(row => {
                return (
                    row.name?.toLowerCase().includes(term) ||
                    row.status?.toLowerCase().includes(term) ||
                    row.gradeName?.toLowerCase().includes(term)
                );
            });
        }

        result.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (valA === undefined || valA === null) valA = "";
            if (valB === undefined || valB === null) valB = "";

            if (typeof valA === "number" && typeof valB === "number") {
                return sortDirection === "asc" ? valA - valB : valB - valA;
            }

            return sortDirection === "asc"
                ? String(valA).localeCompare(String(valB))
                : String(valB).localeCompare(String(valA));
        });

        return result;
    }, [reportData, tableSearch, sortColumn, sortDirection]);

    // Calculate column totals for breakdown table
    const tableTotals = useMemo(() => {
        if (!reportData?.breakdown?.rows) return null;
        const sums: Record<string, number> = {};

        for (const col of reportData.breakdown.columns) {
            if (col.isNumeric && col.key !== "ptr") {
                let total = 0;
                for (const row of reportData.breakdown.rows) {
                    const v = row[col.key];
                    if (typeof v === "number") total += v;
                }
                sums[col.key] = total;
            }
        }

        const totalStudents = sums["studentsCount"] || 0;
        const totalTeachers = sums["teachersCount"] || 0;
        sums["ptr"] = totalTeachers > 0 ? Number((totalStudents / totalTeachers).toFixed(1)) : totalStudents;

        return sums;
    }, [reportData]);

    // Format jurisdiction names with clean Title Case (handles "sidama" -> "Sidama", etc.)
    const formatJurisdictionName = (name: string) => {
        if (!name) return "";
        return name
            .split(" ")
            .map(word => {
                if (!word) return "";
                if (word === word.toUpperCase() && word.length > 1 && !["AFAR", "AMHARA", "OROMIA", "SIDAMA", "TIGRAY", "HAWASA"].includes(word)) {
                    return word;
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(" ");
    };

    // Calculate dynamic super-header groups for official statistical publication table
    const columnGroups = useMemo(() => {
        if (!reportData?.breakdown?.columns) return [];
        const cols = reportData.breakdown.columns;

        const adminKeys = new Set(["name", "zonesCount", "woredasCount", "schoolsCount", "status", "establishedYear", "gradeName", "sectionsCount"]);
        const studentKeys = new Set(["maleStudents", "femaleStudents", "studentsCount"]);
        const teacherKeys = new Set(["maleTeachers", "femaleTeachers", "teachersCount"]);

        const adminCols = cols.filter(c => adminKeys.has(c.key));
        const studentCols = cols.filter(c => studentKeys.has(c.key));
        const teacherCols = cols.filter(c => teacherKeys.has(c.key));
        const ratioCols = cols.filter(c => c.key === "ptr");

        const groups: Array<{ title: string; colSpan: number }> = [];

        if (adminCols.length > 0) {
            let title = "Jurisdiction";
            if (reportData.breakdown.level === "GRADE_SECTION") title = "Class Structure";
            else if (reportData.breakdown.level === "SCHOOL") title = "School Profile";
            groups.push({ title, colSpan: adminCols.length });
        }
        if (studentCols.length > 0) {
            groups.push({ title: "Students", colSpan: studentCols.length });
        }
        if (teacherCols.length > 0) {
            groups.push({ title: "Teachers", colSpan: teacherCols.length });
        }
        if (ratioCols.length > 0) {
            groups.push({ title: "PTR", colSpan: ratioCols.length });
        }

        return groups;
    }, [reportData?.breakdown]);

    // Clean government table title derived from breakdown tier
    const cleanTableTitle = useMemo(() => {
        if (!reportData?.breakdown) return "Distribution & Statistics";
        switch (reportData.breakdown.level) {
            case "REGION":
                return "Regional Breakdown";
            case "ZONE":
                return "Zonal Breakdown";
            case "WOREDA":
                return "Woreda Breakdown";
            case "SCHOOL":
                return "School Breakdown";
            case "GRADE_SECTION":
                return "Grade & Section Breakdown";
            default:
                return reportData.breakdown.title || "Administrative Breakdown";
        }
    }, [reportData?.breakdown]);

    // Clean unit count label (e.g., "6 Regions", "1 Zone", "17 Schools")
    const unitLabel = useMemo(() => {
        if (!reportData?.breakdown) return "";
        const count = filteredBreakdownRows.length;
        switch (reportData.breakdown.level) {
            case "REGION":
                return `${count} ${count === 1 ? "Region" : "Regions"}`;
            case "ZONE":
                return `${count} ${count === 1 ? "Zone" : "Zones"}`;
            case "WOREDA":
                return `${count} ${count === 1 ? "Woreda" : "Woredas"}`;
            case "SCHOOL":
                return `${count} ${count === 1 ? "School" : "Schools"}`;
            case "GRADE_SECTION":
                return `${count} ${count === 1 ? "Grade" : "Grades"}`;
            default:
                return `${count} ${count === 1 ? "Record" : "Records"}`;
        }
    }, [reportData?.breakdown, filteredBreakdownRows.length]);

    // Clean contextual search placeholder
    const searchPlaceholder = useMemo(() => {
        if (!reportData?.breakdown) return "Search...";
        switch (reportData.breakdown.level) {
            case "REGION":
                return "Search region...";
            case "ZONE":
                return "Search zone...";
            case "WOREDA":
                return "Search woreda...";
            case "SCHOOL":
                return "Search school...";
            case "GRADE_SECTION":
                return "Search grade...";
            default:
                return "Search...";
        }
    }, [reportData?.breakdown]);


    const getTierBadge = (type: string) => {
        switch (type) {
            case "FEDERAL":
                return <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">FEDERAL</span>;
            case "REGION":
                return <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">REGION</span>;
            case "ZONE":
                return <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">ZONE</span>;
            case "WOREDA":
                return <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">WOREDA</span>;
            case "SCHOOL":
                return <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-100 text-slate-700 border border-slate-200">SCHOOL</span>;
            default:
                return <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-slate-100 text-slate-700">{type}</span>;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* 1. Page Header (Single Dynamic Government Title) */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-500">
                        Federal Democratic Republic of Ethiopia • Ministry of Education
                    </p>

                    <div className="flex items-center gap-2.5 pt-0.5">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                            {reportData
                                ? reportData.targetOrganization.type === "FEDERAL"
                                    ? "National Education Statistical Abstract"
                                    : `${formatJurisdictionName(reportData.targetOrganization.name)} — Education Statistical Abstract`
                                : "National Education Statistical Abstract"}
                        </h1>
                        {reportData && getTierBadge(reportData.targetOrganization.type)}
                    </div>
                </div>

                {/* Filter & Export Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setShowFilters(prev => !prev)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border transition-all duration-200 cursor-pointer group/btn ${
                            showFilters
                                ? "bg-[#4085b3] border-[#4085b3] text-white"
                                : "bg-white hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] border-slate-300 text-slate-700"
                        }`}
                        title="Toggle Scope & Filters"
                    >
                        <Filter className={`w-3.5 h-3.5 transition-colors ${showFilters ? "text-white" : "text-slate-500 group-hover/btn:text-white"}`} />
                        <span>{showFilters ? "Hide Filters" : "Filter Scope"}</span>
                    </button>

                    <button
                        onClick={() => handleExport("csv")}
                        disabled={!reportData || exportingCsv || generating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] text-slate-700 border border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group/btn"
                        title="Download Raw Disaggregated Data (CSV)"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500 group-hover/btn:text-white transition-colors" />
                        <span>{exportingCsv ? "Exporting..." : "Download CSV"}</span>
                    </button>

                    <button
                        onClick={() => handleExport("excel")}
                        disabled={!reportData || exportingExcel || generating}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] text-slate-700 border border-slate-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group/btn"
                        title="Export Official Statistical Abstract (.xlsx)"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 group-hover/btn:text-white transition-colors" />
                        <span>{exportingExcel ? "Exporting..." : "Export Excel (.xlsx)"}</span>
                    </button>
                </div>
            </div>

            {/* 2. Integrated Scope & Query Bar (Collapsible - Only shown when user clicks Filter Scope) */}
            {showFilters && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[220px] space-y-1">
                            <label className="text-xs font-bold text-slate-800">Governance Tier Scope *</label>
                            <select
                                value={targetLevelCategory}
                                onChange={e => {
                                    const newLevel = e.target.value;
                                    setTargetLevelCategory(newLevel);
                                    if (newLevel === "FEDERAL" || (newLevel === userScopeOrg?.type && newLevel === "REGION")) {
                                        setFilterRegionId("");
                                        setFilterZoneId("");
                                        setFilterWoredaId("");
                                        setFilterSchoolId("");
                                        if (userScopeOrg?.id) {
                                            setSelectedOrgId(userScopeOrg.id);
                                            generateReport(userScopeOrg.id, scopeMode, selectedAcademicYearId);
                                        }
                                    } else if (newLevel === "REGION") {
                                        setFilterZoneId("");
                                        setFilterWoredaId("");
                                        setFilterSchoolId("");
                                    } else if (newLevel === "ZONE") {
                                        setFilterWoredaId("");
                                        setFilterSchoolId("");
                                    } else if (newLevel === "WOREDA") {
                                        setFilterSchoolId("");
                                    }
                                }}
                                disabled={loadingScope || generating}
                                className="w-full text-xs font-medium bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-[#4085b3]"
                            >
                                {userScopeOrg?.type === "FEDERAL" && (
                                    <option value="FEDERAL">National Overview (Entire Country)</option>
                                )}
                                {(userScopeOrg?.type === "FEDERAL" || userScopeOrg?.type === "REGION") && (
                                    <option value="REGION">
                                        {userScopeOrg?.type === "FEDERAL" ? "Target Specific Region (Regional Scope)" : "Regional Overview (Entire Region)"}
                                    </option>
                                )}
                                {(userScopeOrg?.type === "FEDERAL" || userScopeOrg?.type === "REGION" || userScopeOrg?.type === "ZONE") && (
                                    <option value="ZONE">
                                        {userScopeOrg?.type === "ZONE" ? "Zonal Overview (Entire Zone)" : "Target Specific Zone (Zonal Scope)"}
                                    </option>
                                )}
                                {(userScopeOrg?.type === "FEDERAL" || userScopeOrg?.type === "REGION" || userScopeOrg?.type === "ZONE" || userScopeOrg?.type === "WOREDA") && (
                                    <option value="WOREDA">
                                        {userScopeOrg?.type === "WOREDA" ? "Woreda Overview (Entire Woreda)" : "Target Specific Woreda (Woreda Scope)"}
                                    </option>
                                )}
                                <option value="SCHOOL">
                                    {userScopeOrg?.type === "SCHOOL" ? "School Overview (My School)" : "Target Specific School (School Scope)"}
                                </option>
                            </select>
                        </div>

                        <div className="w-full sm:w-56 space-y-1">
                            <label className="text-xs font-bold text-slate-800">Hierarchy Depth</label>
                            <select
                                value={scopeMode}
                                onChange={e => setScopeMode(e.target.value as any)}
                                disabled={loadingScope || generating}
                                className="w-full text-xs bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-[#4085b3]"
                            >
                                <option value="CURRENT_AND_DESCENDANTS">Current Unit & All Descendants</option>
                                <option value="CURRENT_ONLY">Current Organization Only</option>
                            </select>
                        </div>

                        <div className="w-full sm:w-52 space-y-1">
                            <label className="text-xs font-bold text-slate-800">Academic Year</label>
                            <select
                                value={selectedAcademicYearId}
                                onChange={e => setSelectedAcademicYearId(e.target.value)}
                                disabled={loadingScope || generating}
                                className="w-full text-xs bg-white border border-slate-300 px-3 py-2 text-slate-800 focus:outline-[#4085b3]"
                            >
                                <option value="">All Academic Years</option>
                                {academicYears.map(ay => (
                                    <option key={ay.id} value={ay.id}>
                                        {ay.name} ({ay.status})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={() => generateReport()}
                            disabled={generating || loadingScope}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#4085b3] hover:bg-[#336e96] active:bg-[#2b5d80] text-white transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                            <span>{generating ? "Querying..." : "Apply Scope"}</span>
                        </button>
                    </div>

                    {/* Cascading Jurisdictions (when targeting lower level) */}
                    {targetLevelCategory !== "FEDERAL" && (
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                            {userScopeOrg?.type === "FEDERAL" && (
                                <div className="flex-1 min-w-[160px] space-y-1">
                                    <label className="text-[11px] font-bold text-slate-700">Region</label>
                                    <select
                                        value={filterRegionId}
                                        onChange={e => {
                                            const regId = e.target.value;
                                            setFilterRegionId(regId);
                                            setFilterZoneId("");
                                            setFilterWoredaId("");
                                            setFilterSchoolId("");
                                            if (targetLevelCategory === "REGION" && regId) {
                                                setSelectedOrgId(regId);
                                                generateReport(regId, scopeMode, selectedAcademicYearId);
                                            }
                                        }}
                                        disabled={loadingScope || generating}
                                        className="w-full text-xs bg-white border border-slate-300 px-2.5 py-1.5 text-slate-800 focus:outline-[#4085b3]"
                                    >
                                        <option value="">-- Choose Region --</option>
                                        {regionsList.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {(targetLevelCategory === "ZONE" || targetLevelCategory === "WOREDA" || targetLevelCategory === "SCHOOL") &&
                                (userScopeOrg?.type === "FEDERAL" || userScopeOrg?.type === "REGION") && (
                                <div className="flex-1 min-w-[160px] space-y-1">
                                    <label className="text-[11px] font-bold text-slate-700">Zone</label>
                                    <select
                                        value={filterZoneId}
                                        onChange={e => {
                                            const zoneId = e.target.value;
                                            setFilterZoneId(zoneId);
                                            setFilterWoredaId("");
                                            setFilterSchoolId("");
                                            if (targetLevelCategory === "ZONE" && zoneId) {
                                                setSelectedOrgId(zoneId);
                                                generateReport(zoneId, scopeMode, selectedAcademicYearId);
                                            }
                                        }}
                                        disabled={loadingScope || generating || (userScopeOrg?.type === "FEDERAL" && !filterRegionId)}
                                        className="w-full text-xs bg-white border border-slate-300 px-2.5 py-1.5 text-slate-800 focus:outline-[#4085b3] disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        <option value="">
                                            {userScopeOrg?.type === "FEDERAL" && !filterRegionId ? "-- Choose Region First --" : "-- Choose Zone --"}
                                        </option>
                                        {zonesList.map(z => (
                                            <option key={z.id} value={z.id}>{z.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {(targetLevelCategory === "WOREDA" || targetLevelCategory === "SCHOOL") &&
                                (userScopeOrg?.type === "FEDERAL" || userScopeOrg?.type === "REGION" || userScopeOrg?.type === "ZONE") && (
                                <div className="flex-1 min-w-[160px] space-y-1">
                                    <label className="text-[11px] font-bold text-slate-700">Woreda</label>
                                    <select
                                        value={filterWoredaId}
                                        onChange={e => {
                                            const woredaId = e.target.value;
                                            setFilterWoredaId(woredaId);
                                            setFilterSchoolId("");
                                            if (targetLevelCategory === "WOREDA" && woredaId) {
                                                setSelectedOrgId(woredaId);
                                                generateReport(woredaId, scopeMode, selectedAcademicYearId);
                                            }
                                        }}
                                        disabled={
                                            loadingScope ||
                                            generating ||
                                            (userScopeOrg?.type === "FEDERAL" && (!filterRegionId || !filterZoneId)) ||
                                            (userScopeOrg?.type === "REGION" && !filterZoneId)
                                        }
                                        className="w-full text-xs bg-white border border-slate-300 px-2.5 py-1.5 text-slate-800 focus:outline-[#4085b3] disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        <option value="">
                                            {(!filterZoneId && (userScopeOrg?.type === "FEDERAL" || userScopeOrg?.type === "REGION")) ? "-- Choose Zone First --" : "-- Choose Woreda --"}
                                        </option>
                                        {woredasList.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {targetLevelCategory === "SCHOOL" && userScopeOrg?.type !== "SCHOOL" && (
                                <div className="flex-1 min-w-[160px] space-y-1">
                                    <label className="text-[11px] font-bold text-slate-700">School</label>
                                    <select
                                        value={filterSchoolId}
                                        onChange={e => {
                                            const schId = e.target.value;
                                            setFilterSchoolId(schId);
                                            if (schId) {
                                                setSelectedOrgId(schId);
                                                generateReport(schId, scopeMode, selectedAcademicYearId);
                                            }
                                        }}
                                        disabled={loadingScope || generating || (!filterWoredaId && userScopeOrg?.type !== "SCHOOL")}
                                        className="w-full text-xs bg-white border border-slate-300 px-2.5 py-1.5 text-slate-800 focus:outline-[#4085b3] disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        <option value="">
                                            {!filterWoredaId ? "-- Choose Woreda First --" : "-- Choose School --"}
                                        </option>
                                        {schoolsList.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="bg-red-50 border-l-4 border-red-600 p-4 flex items-start gap-3 text-red-900 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold">Unable to generate report: </span>
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {generating && !reportData && (
                <div className="py-12 text-center space-y-3">
                    <RefreshCw className="w-6 h-6 text-[#4085b3] animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-slate-800">Aggregating live administrative data across authorized hierarchy...</p>
                </div>
            )}

            {reportData && (
                <div className="space-y-6">
                    {/* Key Indicators Strip (Official Public Sector KPI Grid with Top-to-Bottom Hover Fill) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {/* 1. Total Learners */}
                        <div className="relative overflow-hidden group bg-slate-50 border border-slate-200 border-t-2 border-t-[#4085b3] p-3.5 flex flex-col justify-between transition-shadow duration-300 hover:shadow-md cursor-default">
                            <div className="absolute inset-0 bg-[#4085b3] -translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block transition-colors duration-300 group-hover:text-blue-100">
                                    Total Learners
                                </span>
                                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums font-mono mt-1 transition-colors duration-300 group-hover:text-white">
                                    {reportData.metrics.totalStudents.toLocaleString()}
                                </p>
                            </div>
                            <p className="relative z-10 text-[11px] text-slate-600 mt-2.5 pt-2 border-t border-slate-200 transition-colors duration-300 group-hover:text-blue-50 group-hover:border-white/20">
                                M: {reportData.metrics.maleStudents.toLocaleString()} • F: {reportData.metrics.femaleStudents.toLocaleString()}
                            </p>
                        </div>

                        {/* 2. Teaching Faculty */}
                        <div className="relative overflow-hidden group bg-slate-50 border border-slate-200 border-t-2 border-t-[#4085b3] p-3.5 flex flex-col justify-between transition-shadow duration-300 hover:shadow-md cursor-default">
                            <div className="absolute inset-0 bg-[#4085b3] -translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block transition-colors duration-300 group-hover:text-blue-100">
                                    Teaching Faculty
                                </span>
                                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums font-mono mt-1 transition-colors duration-300 group-hover:text-white">
                                    {reportData.metrics.totalTeachers.toLocaleString()}
                                </p>
                            </div>
                            <p className="relative z-10 text-[11px] text-slate-600 mt-2.5 pt-2 border-t border-slate-200 transition-colors duration-300 group-hover:text-blue-50 group-hover:border-white/20">
                                M: {reportData.metrics.maleTeachers.toLocaleString()} • F: {reportData.metrics.femaleTeachers.toLocaleString()}
                            </p>
                        </div>

                        {/* 3. Pupil-Teacher Ratio */}
                        <div className="relative overflow-hidden group bg-slate-50 border border-slate-200 border-t-2 border-t-[#4085b3] p-3.5 flex flex-col justify-between transition-shadow duration-300 hover:shadow-md cursor-default">
                            <div className="absolute inset-0 bg-[#4085b3] -translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block transition-colors duration-300 group-hover:text-blue-100">
                                    Pupil-Teacher Ratio
                                </span>
                                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums font-mono mt-1 transition-colors duration-300 group-hover:text-white">
                                    {reportData.metrics.pupilTeacherRatio} : 1
                                </p>
                            </div>
                            <p className="relative z-10 text-[11px] text-slate-600 mt-2.5 pt-2 border-t border-slate-200 transition-colors duration-300 group-hover:text-blue-50 group-hover:border-white/20">
                                Target Standard: ≤ 40 : 1
                            </p>
                        </div>

                        {/* 4. Gender Parity (GPI) */}
                        <div className="relative overflow-hidden group bg-slate-50 border border-slate-200 border-t-2 border-t-[#4085b3] p-3.5 flex flex-col justify-between transition-shadow duration-300 hover:shadow-md cursor-default">
                            <div className="absolute inset-0 bg-[#4085b3] -translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block transition-colors duration-300 group-hover:text-blue-100">
                                    Gender Parity (GPI)
                                </span>
                                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums font-mono mt-1 transition-colors duration-300 group-hover:text-white">
                                    {reportData.metrics.genderParityIndex}
                                </p>
                            </div>
                            <p className="relative z-10 text-[11px] text-slate-600 mt-2.5 pt-2 border-t border-slate-200 transition-colors duration-300 group-hover:text-blue-50 group-hover:border-white/20">
                                {reportData.metrics.genderParityIndex >= 0.97 && reportData.metrics.genderParityIndex <= 1.03
                                    ? "Parity Achieved (0.97–1.03)"
                                    : reportData.metrics.genderParityIndex < 0.97
                                    ? "Male Favoring Disparity"
                                    : "Female Favoring"}
                            </p>
                        </div>

                        {/* 5. Schools */}
                        <div className="relative overflow-hidden group bg-slate-50 border border-slate-200 border-t-2 border-t-[#4085b3] p-3.5 flex flex-col justify-between transition-shadow duration-300 hover:shadow-md cursor-default">
                            <div className="absolute inset-0 bg-[#4085b3] -translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block transition-colors duration-300 group-hover:text-blue-100">
                                    Schools
                                </span>
                                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums font-mono mt-1 transition-colors duration-300 group-hover:text-white">
                                    {reportData.metrics.schoolsCount.toLocaleString()}
                                </p>
                            </div>
                            <p className="relative z-10 text-[11px] text-slate-600 mt-2.5 pt-2 border-t border-slate-200 transition-colors duration-300 group-hover:text-blue-50 group-hover:border-white/20">
                                Operational Facilities
                            </p>
                        </div>

                        {/* 6. Admin Units */}
                        <div className="relative overflow-hidden group bg-slate-50 border border-slate-200 border-t-2 border-t-[#4085b3] p-3.5 flex flex-col justify-between transition-shadow duration-300 hover:shadow-md cursor-default">
                            <div className="absolute inset-0 bg-[#4085b3] -translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block transition-colors duration-300 group-hover:text-blue-100">
                                    Admin Units
                                </span>
                                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums font-mono mt-1 transition-colors duration-300 group-hover:text-white">
                                    {(
                                        reportData.metrics.regionsCount +
                                        reportData.metrics.zonesCount +
                                        reportData.metrics.woredasCount
                                    ).toLocaleString()}
                                </p>
                            </div>
                            <p className="relative z-10 text-[11px] text-slate-600 mt-2.5 pt-2 border-t border-slate-200 transition-colors duration-300 group-hover:text-blue-50 group-hover:border-white/20">
                                {reportData.metrics.regionsCount > 0 ? `${reportData.metrics.regionsCount} Reg ` : ""}
                                {reportData.metrics.zonesCount > 0 ? `${reportData.metrics.zonesCount} Zon ` : ""}
                                {reportData.metrics.woredasCount > 0 ? `${reportData.metrics.woredasCount} Wor` : "Jurisdictions"}
                            </p>
                        </div>
                    </div>

                    {/* 5. Breakdown Data Table (Official Government Grouped Layout) */}
                    <div className="space-y-3 pt-2">
                        {/* Higher-Tier Navigation Bar (Visible when drilled down) */}
                        {reportData.lineage.length > 1 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-50 border border-slate-200 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-500">Location:</span>
                                    <nav aria-label="Table Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                                        {reportData.lineage.slice().reverse().map((item, idx) => {
                                            const isCurrent = item.id === reportData.targetOrganization.id;
                                            return (
                                                <React.Fragment key={item.id}>
                                                    {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400" />}
                                                    {isCurrent ? (
                                                        <span className="font-bold text-slate-900">{formatJurisdictionName(item.name)}</span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDrillDownRow(item.id)}
                                                            className="text-[#4085b3] hover:text-[#2b5d80] hover:underline font-medium cursor-pointer"
                                                        >
                                                            {formatJurisdictionName(item.name)}
                                                        </button>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </nav>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDrillDownRow(reportData.lineage[1].id)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-[#4085b3] text-slate-700 hover:text-white border border-slate-300 hover:border-[#4085b3] transition-all duration-200 cursor-pointer group/nav"
                                        title={`Return to ${reportData.lineage[1].name}`}
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover/nav:text-white transition-colors" />
                                        <span>Up to {formatJurisdictionName(reportData.lineage[1].name)}</span>
                                    </button>

                                    {reportData.lineage.length > 2 && (
                                        <button
                                            onClick={() => handleDrillDownRow(reportData.lineage[reportData.lineage.length - 1].id)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-[#4085b3] text-slate-700 hover:text-white border border-slate-300 hover:border-[#4085b3] transition-all duration-200 cursor-pointer"
                                            title="Return to National Scope"
                                        >
                                            <span>National Overview</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{cleanTableTitle}</h3>
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    {unitLabel}
                                </span>
                            </div>

                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={tableSearch}
                                    onChange={e => setTableSearch(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full text-xs bg-white border border-slate-300 pl-8 pr-3 py-1.5 text-slate-800 focus:outline-[#4085b3] placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Table with Two-Tier Grouped Super-Headers */}
                        <div className="overflow-x-auto border-t border-slate-300">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    {/* Super-Header Row */}
                                    <tr className="border-b border-slate-200 text-slate-600 bg-slate-100/90 text-[11px] font-semibold tracking-normal">
                                        {columnGroups.map((grp, gIdx) => (
                                            <th
                                                key={grp.title}
                                                colSpan={grp.colSpan}
                                                className={`py-2 px-3 border-r border-slate-300 last:border-r-0 ${
                                                    gIdx === 0 ? "text-left" : "text-center"
                                                }`}
                                            >
                                                {grp.title}
                                            </th>
                                        ))}
                                    </tr>

                                    {/* Sub-Header Column Labels */}
                                    <tr className="border-b-2 border-slate-800 text-slate-800 text-xs font-semibold bg-slate-50/80">
                                        {reportData.breakdown.columns.map(col => {
                                            const isSorted = sortColumn === col.key;
                                            let displayLabel = col.label;
                                            if (col.key === "maleStudents" || col.key === "maleTeachers") displayLabel = "Male";
                                            else if (col.key === "femaleStudents" || col.key === "femaleTeachers") displayLabel = "Female";
                                            else if (col.key === "studentsCount" || col.key === "teachersCount") displayLabel = "Total";
                                            else if (col.key === "ptr") displayLabel = "PTR";
                                            else if (col.key === "zonesCount") displayLabel = "Zones";
                                            else if (col.key === "woredasCount") displayLabel = "Woredas";
                                            else if (col.key === "schoolsCount") displayLabel = "Schools";
                                            else if (col.key === "sectionsCount") displayLabel = "Sections";

                                            return (
                                                <th
                                                    key={col.key}
                                                    onClick={() => handleSort(col.key)}
                                                    className={`py-2.5 px-3 cursor-pointer select-none transition-colors group/th hover:bg-slate-100/90 ${
                                                        col.align === "right"
                                                            ? "text-right"
                                                            : col.align === "center"
                                                            ? "text-center"
                                                            : "text-left"
                                                    } ${isSorted ? "bg-slate-100 text-slate-950 font-bold" : ""}`}
                                                    title={`Sort by ${displayLabel}`}
                                                >
                                                    <div className={`inline-flex items-center gap-1 ${col.align === "right" ? "flex-row-reverse" : ""}`}>
                                                        <span>{displayLabel}</span>
                                                        {isSorted ? (
                                                            sortDirection === "asc" ? (
                                                                <ChevronUp className="w-3.5 h-3.5 text-[#4085b3] shrink-0" />
                                                            ) : (
                                                                <ChevronDown className="w-3.5 h-3.5 text-[#4085b3] shrink-0" />
                                                            )
                                                        ) : (
                                                            <ArrowUpDown className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/th:opacity-100 transition-opacity shrink-0" />
                                                        )}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-slate-800">
                                    {filteredBreakdownRows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={reportData.breakdown.columns.length}
                                                className="px-4 py-8 text-center text-slate-400 text-xs"
                                            >
                                                No breakdown records match your search query.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBreakdownRows.map((row, idx) => (
                                            <tr
                                                key={row.id || idx}
                                                onClick={() => row.id && handleDrillDownRow(row.id)}
                                                className="hover:bg-slate-50 cursor-pointer transition-colors"
                                            >
                                                {reportData.breakdown.columns.map((col, cIdx) => {
                                                    const cellVal = row[col.key];

                                                    // Column 0: Jurisdiction Name (Interactive drill link)
                                                    if (cIdx === 0) {
                                                        const isDrillable = row.id && reportData.breakdown.level !== "GRADE_SECTION";
                                                        return (
                                                            <td key={col.key} className="py-2.5 px-3 text-left">
                                                                {isDrillable ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDrillDownRow(row.id);
                                                                        }}
                                                                        className="inline-flex items-center gap-1.5 font-bold text-[#4085b3] hover:text-[#2b5d80] hover:underline text-left cursor-pointer group/link"
                                                                        title={`Drill down into ${formatJurisdictionName(row.name)}`}
                                                                    >
                                                                        <span>{formatJurisdictionName(row.name)}</span>
                                                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover/link:text-[#4085b3] transition-colors" />
                                                                    </button>
                                                                ) : (
                                                                    <span className="font-bold text-slate-900">
                                                                        {formatJurisdictionName(row.name || row.gradeName || "—")}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        );
                                                    }

                                                    // Numeric Columns
                                                    if (col.isNumeric) {
                                                        if (col.key === "ptr") {
                                                            const numVal = typeof cellVal === "number" ? cellVal : Number(cellVal);
                                                            return (
                                                                <td key={col.key} className="py-2.5 px-3 text-right font-medium tabular-nums font-mono text-slate-900">
                                                                    {numVal > 0 ? numVal.toFixed(1) : <span className="text-slate-300 font-mono">—</span>}
                                                                </td>
                                                            );
                                                        }

                                                        const countVal = typeof cellVal === "number" ? cellVal : Number(cellVal);
                                                        return (
                                                            <td key={col.key} className="py-2.5 px-3 text-right font-medium tabular-nums font-mono">
                                                                {countVal > 0 ? (
                                                                    <span className="text-slate-900 font-semibold">{countVal.toLocaleString()}</span>
                                                                ) : (
                                                                    <span className="text-slate-300 font-mono">—</span>
                                                                )}
                                                            </td>
                                                        );
                                                    }

                                                    // Text/Status Columns
                                                    return (
                                                        <td
                                                            key={col.key}
                                                            className={`py-2.5 px-3 ${
                                                                col.align === "center" ? "text-center" : "text-left font-medium text-slate-800"
                                                            }`}
                                                        >
                                                            {cellVal !== undefined && cellVal !== null ? String(cellVal) : "—"}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>

                                {/* Aggregate Totals Footer */}
                                {tableTotals && filteredBreakdownRows.length > 0 && (
                                    <tfoot>
                                        <tr className="border-t-2 border-b-2 border-slate-900 font-bold text-slate-950 bg-slate-100/80 text-xs">
                                            {reportData.breakdown.columns.map((col, colIdx) => (
                                                <td
                                                    key={col.key}
                                                    className={`py-3 px-3 ${
                                                        colIdx === 0
                                                            ? "text-left text-slate-950 font-bold"
                                                            : col.align === "right"
                                                            ? "text-right text-slate-950 font-bold tabular-nums font-mono"
                                                            : "text-center font-bold"
                                                    }`}
                                                >
                                                    {colIdx === 0
                                                        ? reportData.breakdown.level === "REGION"
                                                            ? "National Total"
                                                            : "Total"
                                                        : col.isNumeric && tableTotals[col.key] !== undefined
                                                        ? col.key === "ptr"
                                                            ? tableTotals[col.key] > 0
                                                                ? `${tableTotals[col.key].toFixed(1)}`
                                                                : "—"
                                                            : tableTotals[col.key] === 0
                                                            ? "—"
                                                            : tableTotals[col.key].toLocaleString()
                                                        : "—"}
                                                </td>
                                            ))}
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* 6. Disaggregation Section (Clean 3-Column Layout - No Card Boxes) */}
                    {reportData.analytics && (
                        <div className="pt-6 border-t border-slate-200 space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900">
                                Demographic & Operational Breakdown
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                                {/* Ledger 1: Gender & Demographic Equity */}
                                <div className="space-y-3 pb-6 md:pb-0 md:pr-8">
                                    <h4 className="text-xs font-semibold text-slate-900 pb-2 border-b border-slate-200">
                                        Demographic & Gender Census
                                    </h4>

                                    <div className="space-y-4 text-xs pt-1">
                                        {/* Student Enrollment */}
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center text-slate-800">
                                                <span className="font-medium">Student Enrollment</span>
                                                <span className="font-bold tabular-nums font-mono text-slate-900">
                                                    {reportData.analytics.gender.totalStudents > 0
                                                        ? reportData.analytics.gender.totalStudents.toLocaleString()
                                                        : "—"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-[11px] text-slate-500">
                                                <span>Male: {reportData.analytics.gender.maleStudents.toLocaleString()}</span>
                                                <span>Female: {reportData.analytics.gender.femaleStudents.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Teaching Faculty */}
                                        <div className="space-y-1.5 pt-3 border-t border-slate-100">
                                            <div className="flex justify-between items-center text-slate-800">
                                                <span className="font-medium">Teaching Faculty</span>
                                                <span className="font-bold tabular-nums font-mono text-slate-900">
                                                    {reportData.analytics.gender.totalTeachers > 0
                                                        ? reportData.analytics.gender.totalTeachers.toLocaleString()
                                                        : "—"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-[11px] text-slate-500">
                                                <span>Male: {reportData.analytics.gender.maleTeachers.toLocaleString()}</span>
                                                <span>Female: {reportData.analytics.gender.femaleTeachers.toLocaleString()}</span>
                                            </div>
                                        </div>

                                        {/* Parity Index */}
                                        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                            <span className="font-medium text-slate-800">Gender Parity Index (GPI)</span>
                                            <span className="font-bold text-sm text-slate-900 tabular-nums font-mono">
                                                {reportData.analytics.gender.genderParityIndex > 0
                                                    ? reportData.analytics.gender.genderParityIndex.toFixed(2)
                                                    : "—"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Ledger 2: Faculty Qualifications */}
                                <div className="space-y-3 py-6 md:py-0 md:px-8">
                                    <h4 className="text-xs font-semibold text-slate-900 pb-2 border-b border-slate-200">
                                        Faculty Qualifications
                                    </h4>

                                    <div className="divide-y divide-slate-100 text-xs">
                                        {[
                                            { label: "Doctorate (PhD)", count: reportData.analytics.staffing.qualifications.doctorate },
                                            { label: "Master's Degree (MA/MSc)", count: reportData.analytics.staffing.qualifications.masters },
                                            { label: "Bachelor's Degree (BA/BSc)", count: reportData.analytics.staffing.qualifications.bachelors },
                                            { label: "Diploma (10+3 / 12+2)", count: reportData.analytics.staffing.qualifications.diploma },
                                            { label: "Certificate / Other", count: reportData.analytics.staffing.qualifications.certificate + reportData.analytics.staffing.qualifications.other }
                                        ].map(item => (
                                            <div key={item.label} className="py-2.5 flex items-center justify-between">
                                                <span className="text-slate-700">{item.label}</span>
                                                <span className={`tabular-nums font-mono text-right ${
                                                    item.count > 0 ? "font-bold text-slate-900" : "text-slate-300"
                                                }`}>
                                                    {item.count > 0 ? item.count.toLocaleString() : "—"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Ledger 3: Student Cohort & Retention Status */}
                                <div className="space-y-3 pt-6 md:pt-0 md:pl-8">
                                    <h4 className="text-xs font-semibold text-slate-900 pb-2 border-b border-slate-200">
                                        Student Retention Profile
                                    </h4>

                                    <div className="divide-y divide-slate-100 text-xs">
                                        {[
                                            { label: "Active / Enrolled Cohort", count: reportData.analytics.studentRetention.enrolled + reportData.analytics.studentRetention.active },
                                            { label: "Transferred Out", count: reportData.analytics.studentRetention.transferred },
                                            { label: "Withdrawn", count: reportData.analytics.studentRetention.withdrawn },
                                            { label: "Dropped Out", count: reportData.analytics.studentRetention.droppedOut },
                                            { label: "Graduated / Promoted", count: reportData.analytics.studentRetention.graduated }
                                        ].map(st => (
                                            <div key={st.label} className="py-2.5 flex items-center justify-between">
                                                <span className="text-slate-700">{st.label}</span>
                                                <span className={`tabular-nums font-mono text-right ${
                                                    st.count > 0 ? "font-bold text-slate-900" : "text-slate-300"
                                                }`}>
                                                    {st.count > 0 ? st.count.toLocaleString() : "—"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
