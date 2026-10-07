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
    Search,
    AlertCircle,
    CheckCircle2,
    ArrowUpDown,
    CornerDownRight
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
    studentsCount?: number;
    teachersCount?: number;
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
        totalTeachers: number;
        gradesCount: number;
        sectionsCount: number;
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
    const [selectedReportType, setSelectedReportType] = useState<string>("EDUCATION_SUMMARY");

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

        const unitMap = new Map(units.map(u => [u.id, u]));

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
            const parentZone = target.parentId ? unitMap.get(target.parentId) : null;
            setFilterRegionId(parentZone?.parentId || "");
            setFilterZoneId(target.parentId || "");
            setFilterWoredaId(target.id);
            setFilterSchoolId("");
        } else if (target.type === "SCHOOL") {
            setTargetLevelCategory("SCHOOL");
            const parentWoreda = target.parentId ? unitMap.get(target.parentId) : null;
            const parentZone = parentWoreda?.parentId ? unitMap.get(parentWoreda.parentId) : null;
            setFilterRegionId(parentZone?.parentId || "");
            setFilterZoneId(parentWoreda?.parentId || "");
            setFilterWoredaId(target.parentId || "");
            setFilterSchoolId(target.id);
        }
    };

    // Load available scope and organizations on mount
    useEffect(() => {
        loadReportingScope();
    }, []);

    const loadReportingScope = async () => {
        setLoadingScope(true);
        setError(null);
        try {
            const res = await fetchApi("/hierarchical-reports/scope");
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to load reporting scope.");
            }
            const payload = await res.json();
            const data = payload.data;
            const units: AccessibleUnit[] = data.accessibleOrganizations || [];
            setAccessibleUnits(units);
            setAcademicYears(data.academicYears || []);
            
            const userScope = {
                id: data.userScope.currentOrganizationId,
                name: data.userScope.currentOrganizationName,
                type: data.userScope.currentOrganizationType
            };
            setUserScopeOrg(userScope);
            setTargetLevelCategory(userScope.type);

            // Set initial selected organization
            const targetId = initialTargetOrgId || userScope.id;
            setSelectedOrgId(targetId);
            syncFiltersFromOrgId(targetId, units);

            // Trigger initial report generation
            generateReport(targetId, scopeMode, selectedAcademicYearId);
        } catch (err: any) {
            setError(err.message || "Failed to initialize reporting scope.");
        } finally {
            setLoadingScope(false);
        }
    };

    const generateReport = async (
        orgId: string = selectedOrgId,
        mode: "CURRENT_AND_DESCENDANTS" | "CURRENT_ONLY" = scopeMode,
        ayId: string = selectedAcademicYearId
    ) => {
        if (!orgId && !userScopeOrg?.id) return;
        setGenerating(true);
        setError(null);

        const targetId = orgId || userScopeOrg?.id || "";

        try {
            const queryParams = new URLSearchParams();
            if (targetId) queryParams.set("targetOrganizationId", targetId);
            queryParams.set("scopeMode", mode);
            if (ayId) queryParams.set("academicYearId", ayId);

            const res = await fetchApi(`/hierarchical-reports/education-summary?${queryParams.toString()}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to generate Education Summary report.");
            }
            const payload = await res.json();
            setReportData(payload.data);
        } catch (err: any) {
            setError(err.message || "An error occurred while generating report data.");
        } finally {
            setGenerating(false);
        }
    };

    // Trigger report download (CSV or Excel)
    const handleExport = async (format: "csv" | "excel") => {
        if (!reportData) return;
        const setExporting = format === "csv" ? setExportingCsv : setExportingExcel;
        setExporting(true);

        try {
            const queryParams = new URLSearchParams();
            queryParams.set("targetOrganizationId", reportData.targetOrganization.id);
            queryParams.set("scopeMode", reportData.scopeMode);
            if (reportData.academicYear?.id) {
                queryParams.set("academicYearId", reportData.academicYear.id);
            }
            queryParams.set("format", format);

            const downloadUrl = `/api/hierarchical-reports/education-summary/export?${queryParams.toString()}`;
            
            // Trigger browser direct download
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.setAttribute("download", `Education_Summary_${format}.${format === "excel" ? "xlsx" : "csv"}`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err: any) {
            alert(`Export failed: ${err.message || "Could not download report file."}`);
        } finally {
            setExporting(false);
        }
    };

    // Helper for tier badges
    const getTierBadge = (type: string) => {
        switch (type) {
            case "FEDERAL":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">Federal</span>;
            case "REGION":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">Region</span>;
            case "ZONE":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Zone</span>;
            case "WOREDA":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">Woreda</span>;
            case "SCHOOL":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">School</span>;
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">{type}</span>;
        }
    };

    // Filtered & Sorted Breakdown Table Rows
    const filteredBreakdownRows = useMemo(() => {
        if (!reportData?.breakdown?.rows) return [];
        let rows = [...reportData.breakdown.rows];

        // Search filter
        if (tableSearch.trim()) {
            const query = tableSearch.toLowerCase();
            rows = rows.filter(r => (r.name || r.gradeName || "").toLowerCase().includes(query));
        }

        // Sorting
        rows.sort((a, b) => {
            const valA = a[sortColumn];
            const valB = b[sortColumn];

            if (typeof valA === "number" && typeof valB === "number") {
                return sortDirection === "asc" ? valA - valB : valB - valA;
            }
            const strA = String(valA || "").toLowerCase();
            const strB = String(valB || "").toLowerCase();
            return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        });

        return rows;
    }, [reportData, tableSearch, sortColumn, sortDirection]);

    const handleSort = (colKey: string) => {
        if (sortColumn === colKey) {
            setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortColumn(colKey);
            setSortDirection("asc");
        }
    };

    // Drill down into child unit directly from table row click
    const handleDrillDownRow = (rowUnitId: string) => {
        if (!rowUnitId || rowUnitId === reportData?.targetOrganization.id) return;
        syncFiltersFromOrgId(rowUnitId);
        setSelectedOrgId(rowUnitId);
        generateReport(rowUnitId, scopeMode, selectedAcademicYearId);
    };

    return (
        <div className="space-y-6 font-sans">
            {/* Top Title & Quick Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-[#0d233a] to-[#1a3a5f] p-6 rounded-2xl shadow-md text-white">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-6 h-6 text-blue-300" />
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                            Hierarchical Reports & Analytics
                        </h1>
                    </div>
                    <p className="text-xs md:text-sm text-blue-100/80">
                        Authoritative education data aggregation & multi-format export across the national hierarchy
                    </p>
                </div>

                {/* Export Buttons */}
                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        onClick={() => handleExport("csv")}
                        disabled={!reportData || exportingCsv || generating}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/20 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-3.5 h-3.5" />
                        {exportingCsv ? "Exporting CSV..." : "Export CSV"}
                    </button>

                    <button
                        onClick={() => handleExport("excel")}
                        disabled={!reportData || exportingExcel || generating}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        {exportingExcel ? "Exporting Excel..." : "Export Excel (.xlsx)"}
                    </button>
                </div>
            </div>

            {/* Simple Filters Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                        <Filter className="w-4 h-4 text-blue-600" />
                        <span>Report Configuration & Filters</span>
                    </div>
                    <span className="text-xs text-slate-400">Enforcing HierarchyScopeService</span>
                </div>

                {/* Level / Audience Selector & Cascading Filters */}
                <div className="space-y-3">
                    {/* 1. Target Level Selection */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Target Level / Scope *</label>
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
                            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                            {userScopeOrg?.type === "FEDERAL" && (
                                <option value="FEDERAL">National Overview (Entire Country)</option>
                            )}
                            {(userScopeOrg?.type === "FEDERAL" || userScopeOrg?.type === "REGION") && (
                                <option value="REGION">
                                    {userScopeOrg?.type === "FEDERAL" ? "Target Specific Region (Region Scope)" : "Regional Overview (Entire Region)"}
                                </option>
                            )}
                            {(userScopeOrg?.type === "FEDERAL" || userScopeOrg?.type === "REGION" || userScopeOrg?.type === "ZONE") && (
                                <option value="ZONE">
                                    {userScopeOrg?.type === "ZONE" ? "Zonal Overview (Entire Zone)" : "Target Specific Zone (Zone Scope)"}
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

                    {/* 2. Cascading Child Selectors Grid */}
                    {targetLevelCategory !== "FEDERAL" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                            {/* Region Dropdown (If user is Federal and selected tier is Region, Zone, Woreda, or School) */}
                            {userScopeOrg?.type === "FEDERAL" && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-600">1. Select Region *</label>
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
                                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    >
                                        <option value="">-- Choose Region --</option>
                                        {regionsList.map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Zone Dropdown (If tier is Zone, Woreda, or School) */}
                            {(targetLevelCategory === "ZONE" || targetLevelCategory === "WOREDA" || targetLevelCategory === "SCHOOL") &&
                                (userScopeOrg?.type === "FEDERAL" || userScopeOrg?.type === "REGION") && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-600">
                                        {userScopeOrg?.type === "FEDERAL" ? "2. Select Zone *" : "1. Select Zone *"}
                                    </label>
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
                                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        <option value="">
                                            {userScopeOrg?.type === "FEDERAL" && !filterRegionId
                                                ? "-- Choose Region First --"
                                                : "-- Choose Zone --"}
                                        </option>
                                        {zonesList.map(z => (
                                            <option key={z.id} value={z.id}>
                                                {z.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Woreda Dropdown (If tier is Woreda or School) */}
                            {(targetLevelCategory === "WOREDA" || targetLevelCategory === "SCHOOL") &&
                                (userScopeOrg?.type === "FEDERAL" || userScopeOrg?.type === "REGION" || userScopeOrg?.type === "ZONE") && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-600">
                                        {userScopeOrg?.type === "FEDERAL"
                                            ? "3. Select Woreda *"
                                            : userScopeOrg?.type === "REGION"
                                            ? "2. Select Woreda *"
                                            : "1. Select Woreda *"}
                                    </label>
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
                                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        <option value="">
                                            {(!filterZoneId && (userScopeOrg?.type === "FEDERAL" || userScopeOrg?.type === "REGION"))
                                                ? "-- Choose Zone First --"
                                                : "-- Choose Woreda --"}
                                        </option>
                                        {woredasList.map(w => (
                                            <option key={w.id} value={w.id}>
                                                {w.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* School Dropdown (If tier is School) */}
                            {targetLevelCategory === "SCHOOL" && userScopeOrg?.type !== "SCHOOL" && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-semibold text-slate-600">
                                        {userScopeOrg?.type === "FEDERAL"
                                            ? "4. Select School *"
                                            : userScopeOrg?.type === "REGION"
                                            ? "3. Select School *"
                                            : "2. Select School *"}
                                    </label>
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
                                        className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        <option value="">
                                            {!filterWoredaId ? "-- Choose Woreda First --" : "-- Choose School --"}
                                        </option>
                                        {schoolsList.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Scope Depth Mode */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Hierarchy Depth</label>
                        <select
                            value={scopeMode}
                            onChange={e => setScopeMode(e.target.value as any)}
                            disabled={loadingScope || generating}
                            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                            <option value="CURRENT_AND_DESCENDANTS">Current & All Descendants</option>
                            <option value="CURRENT_ONLY">Current Organization Only</option>
                        </select>
                    </div>

                    {/* Academic Year */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Academic Year (Optional)</label>
                        <select
                            value={selectedAcademicYearId}
                            onChange={e => setSelectedAcademicYearId(e.target.value)}
                            disabled={loadingScope || generating}
                            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                            <option value="">All Academic Years</option>
                            {academicYears.map(ay => (
                                <option key={ay.id} value={ay.id}>
                                    {ay.name} ({ay.status})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Report Type & Generate Button Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">Report Type:</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            Education Summary Report (Authoritative)
                        </span>
                    </div>

                    <button
                        onClick={() => generateReport()}
                        disabled={generating || loadingScope}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                        {generating ? "Generating Live Report..." : "Generate Report"}
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-red-800 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <span className="font-semibold">Unable to generate report:</span>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            {/* Loading Skeleton */}
            {generating && !reportData && (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-slate-800">Aggregating live data across authorized hierarchy...</p>
                    <p className="text-xs text-slate-500">Querying live schools, students, teachers, and units...</p>
                </div>
            )}

            {/* Generated Report Content */}
            {reportData && (
                <div className="space-y-6">
                    {/* Breadcrumbs & Organization Context Banner */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                            <span className="font-medium text-slate-700">Hierarchy Lineage:</span>
                            {reportData.lineage.slice().reverse().map((item, idx) => (
                                <React.Fragment key={item.id}>
                                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                                    <button
                                        onClick={() => handleDrillDownRow(item.id)}
                                        className={`hover:underline font-medium ${
                                            item.id === reportData.targetOrganization.id
                                                ? "text-blue-700 font-bold"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        {item.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-100">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-bold text-slate-900">{reportData.title}</h2>
                                    {getTierBadge(reportData.targetOrganization.type)}
                                </div>
                                <p className="text-xs text-slate-500">
                                    Mode:{" "}
                                    <span className="font-medium text-slate-700">
                                        {reportData.scopeMode === "CURRENT_AND_DESCENDANTS"
                                            ? "Target Unit & All Subordinate Descendants"
                                            : "Target Unit Only"}
                                    </span>{" "}
                                    • Generated: {new Date(reportData.generatedAt).toLocaleString()}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Live Authoritative Data
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Summary Metrics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                        {reportData.metrics.regionsCount > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-1">
                                <div className="flex items-center justify-between text-slate-500">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider">Regions</span>
                                    <Layers className="w-4 h-4 text-blue-600" />
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-slate-900">
                                    {reportData.metrics.regionsCount.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-slate-400">Regional Bureaus</p>
                            </div>
                        )}

                        {reportData.metrics.zonesCount > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-1">
                                <div className="flex items-center justify-between text-slate-500">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider">Zones</span>
                                    <Building2 className="w-4 h-4 text-emerald-600" />
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-slate-900">
                                    {reportData.metrics.zonesCount.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-slate-400">Administrative Zones</p>
                            </div>
                        )}

                        {reportData.metrics.woredasCount > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-1">
                                <div className="flex items-center justify-between text-slate-500">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider">Woredas</span>
                                    <MapPin className="w-4 h-4 text-amber-600" />
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-slate-900">
                                    {reportData.metrics.woredasCount.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-slate-400">Woreda Offices</p>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-1">
                            <div className="flex items-center justify-between text-slate-500">
                                <span className="text-[11px] font-semibold uppercase tracking-wider">Schools</span>
                                <School className="w-4 h-4 text-purple-600" />
                            </div>
                            <p className="text-xl sm:text-2xl font-bold text-slate-900">
                                {reportData.metrics.schoolsCount.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-400">Operating Schools</p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-1">
                            <div className="flex items-center justify-between text-slate-500">
                                <span className="text-[11px] font-semibold uppercase tracking-wider">Students</span>
                                <GraduationCap className="w-4 h-4 text-indigo-600" />
                            </div>
                            <p className="text-xl sm:text-2xl font-bold text-slate-900">
                                {reportData.metrics.totalStudents.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-400">Enrolled Students</p>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-1">
                            <div className="flex items-center justify-between text-slate-500">
                                <span className="text-[11px] font-semibold uppercase tracking-wider">Teachers</span>
                                <Users className="w-4 h-4 text-teal-600" />
                            </div>
                            <p className="text-xl sm:text-2xl font-bold text-slate-900">
                                {reportData.metrics.totalTeachers.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-slate-400">Appointed Teachers</p>
                        </div>

                        {reportData.metrics.gradesCount > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-1">
                                <div className="flex items-center justify-between text-slate-500">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider">Grades</span>
                                    <BookOpen className="w-4 h-4 text-rose-600" />
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-slate-900">
                                    {reportData.metrics.gradesCount.toLocaleString()}
                                </p>
                                <p className="text-[10px] text-slate-400">Academic Grades</p>
                            </div>
                        )}
                    </div>

                    {/* Breakdown Data Table */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="space-y-0.5">
                                <h3 className="text-base font-bold text-slate-900">{reportData.breakdown.title}</h3>
                                <p className="text-xs text-slate-500">
                                    Showing {filteredBreakdownRows.length} of {reportData.breakdown.rows.length} rows • Click any row to drill down into its sub-hierarchy
                                </p>
                            </div>

                            {/* Table Search Input */}
                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={tableSearch}
                                    onChange={e => setTableSearch(e.target.value)}
                                    placeholder="Filter by name..."
                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                                        {reportData.breakdown.columns.map(col => (
                                            <th
                                                key={col.key}
                                                onClick={() => handleSort(col.key)}
                                                className={`px-4 py-3 cursor-pointer select-none hover:bg-slate-100 transition-colors ${
                                                    col.align === "right"
                                                        ? "text-right"
                                                        : col.align === "center"
                                                        ? "text-center"
                                                        : "text-left"
                                                }`}
                                            >
                                                <div
                                                    className={`inline-flex items-center gap-1.5 ${
                                                        col.align === "right" ? "flex-row-reverse" : ""
                                                    }`}
                                                >
                                                    <span>{col.label}</span>
                                                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-center w-24">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                    {filteredBreakdownRows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={reportData.breakdown.columns.length + 1}
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
                                                className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                                            >
                                                {reportData.breakdown.columns.map(col => {
                                                    const cellVal = row[col.key];
                                                    return (
                                                        <td
                                                            key={col.key}
                                                            className={`px-4 py-3 ${
                                                                col.align === "right"
                                                                    ? "text-right font-medium"
                                                                    : col.align === "center"
                                                                    ? "text-center"
                                                                    : "text-left font-semibold text-slate-900"
                                                            }`}
                                                        >
                                                            {col.isNumeric && typeof cellVal === "number"
                                                                ? cellVal.toLocaleString()
                                                                : cellVal !== undefined && cellVal !== null
                                                                ? String(cellVal)
                                                                : "—"}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-3 text-center">
                                                    {row.id && reportData.breakdown.level !== "GRADE_SECTION" ? (
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                handleDrillDownRow(row.id);
                                                            }}
                                                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                                        >
                                                            <CornerDownRight className="w-3 h-3" />
                                                            Drill
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300 text-[10px]">Leaf</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
