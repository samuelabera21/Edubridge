"use client";

import React, { useState, useMemo } from "react";
import {
    Plus,
    Search,
    ChevronRight,
    ArrowLeft,
    ArrowUpRight,
    RefreshCw,
    X,
    AlertCircle,
    UserPlus,
    School
} from "lucide-react";
import { DrilldownData, DrilldownChildItem } from "./FederalDashboard";

export interface RegionalHierarchyViewProps {
    drilldownData: DrilldownData | null;
    loading: boolean;
    error: string | null;
    onNavigateToUnit: (unitId?: string | null) => void;
    onNavigateBack: () => void;
    onRefresh: () => void;
    onOpenAddRegion?: () => void;
    onOpenAssignAdmin?: (region: { id: string; name: string }) => void;
    title?: string;
    addUnitLabel?: string;
}

export default function RegionalHierarchyView({
    drilldownData,
    loading,
    error,
    onNavigateToUnit,
    onNavigateBack,
    onRefresh,
    onOpenAddRegion,
    onOpenAssignAdmin,
    title,
    addUnitLabel
}: RegionalHierarchyViewProps) {
    const [searchQuery, setSearchQuery] = useState("");

    const resolvedTitle = title || (
        drilldownData?.node?.type === "REGION" ? "Zonal hierarchy & directory" :
        drilldownData?.node?.type === "ZONE" ? "Woreda hierarchy & directory" :
        drilldownData?.node?.type === "WOREDA" ? "School directory & institutions" :
        "Regional hierarchy & directory"
    );

    const resolvedAddLabel = addUnitLabel || (
        drilldownData?.node?.type === "REGION" ? "Add zone" :
        drilldownData?.node?.type === "ZONE" ? "Add woreda" :
        drilldownData?.node?.type === "WOREDA" ? "Add school" :
        "Add region"
    );

    // Current level metadata
    const isFederal = !drilldownData || drilldownData.node.type === "FEDERAL";
    const isSchool = drilldownData?.node.type === "SCHOOL";

    // Filter children by search query
    const filteredChildren = useMemo(() => {
        if (!drilldownData?.children) return [];
        if (!searchQuery.trim()) return drilldownData.children;
        const q = searchQuery.toLowerCase().trim();
        return drilldownData.children.filter((c) => {
            const matchName = c.name.toLowerCase().includes(q);
            const matchAdmin = c.admin?.name.toLowerCase().includes(q) || c.admin?.email.toLowerCase().includes(q) || false;
            return matchName || matchAdmin;
        });
    }, [drilldownData?.children, searchQuery]);

    // Format numbers
    const fmt = (num?: number | null) => {
        if (num === undefined || num === null) return "0";
        return num.toLocaleString();
    };

    // Construct a concise, neutral single-line summary of current footprint
    const footprintSummary = useMemo(() => {
        if (!drilldownData) return "";
        const c = drilldownData.counts;
        const parts: string[] = [];

        if (c.totalRegions !== undefined && c.totalRegions > 0) {
            parts.push(`${fmt(c.totalRegions)} ${c.totalRegions === 1 ? "region" : "regions"}`);
        }
        if (c.zonesCount !== undefined && c.zonesCount > 0) {
            parts.push(`${fmt(c.zonesCount)} ${c.zonesCount === 1 ? "zone" : "zones"}`);
        }
        if (c.woredasCount !== undefined && c.woredasCount > 0) {
            parts.push(`${fmt(c.woredasCount)} ${c.woredasCount === 1 ? "woreda" : "woredas"}`);
        }
        if (c.schoolsCount !== undefined && c.schoolsCount > 0) {
            parts.push(`${fmt(c.schoolsCount)} ${c.schoolsCount === 1 ? "school" : "schools"}`);
        }
        if (c.studentsCount !== undefined && c.studentsCount > 0) {
            parts.push(`${fmt(c.studentsCount)} students`);
        }
        if (c.teachersCount !== undefined && c.teachersCount > 0) {
            parts.push(`${fmt(c.teachersCount)} teachers`);
        }

        return parts.length > 0 ? parts.join(" · ") : "No subordinate entities registered";
    }, [drilldownData]);

    return (
        <div className="space-y-6 font-sans text-slate-900 max-w-7xl">
            {/* 1. SINGLE CLEAN HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {resolvedTitle}
                    </h1>
                    {footprintSummary && (
                        <p className="text-xs text-slate-500 mt-0.5">
                            {footprintSummary}
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {/* Refresh Button with standard hover effect */}
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="p-2 border border-slate-300 bg-white hover:bg-[#4085b3] text-slate-700 hover:text-white hover:border-[#4085b3] rounded transition-all duration-200 cursor-pointer group/refresh"
                        title="Reload directory data"
                        aria-label="Reload directory data"
                    >
                        <RefreshCw className={`w-4 h-4 transition-colors ${loading ? "animate-spin text-[#4085b3]" : "text-slate-500 group-hover/refresh:text-white"}`} />
                    </button>

                    {/* Clean "Add" Button */}
                    {onOpenAddRegion && (
                        <button
                            type="button"
                            onClick={onOpenAddRegion}
                            className="px-3.5 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-sm font-medium rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{resolvedAddLabel}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div role="alert" className="p-3.5 border-l-4 border-rose-600 bg-rose-50 text-slate-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="text-xs font-semibold text-[#4085b3] hover:underline cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* 2. CLEAN BREADCRUMB NAVIGATION */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
                {drilldownData?.breadcrumbs && drilldownData.breadcrumbs.length > 1 && (
                    <button
                        type="button"
                        onClick={onNavigateBack}
                        className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0 mr-1"
                        title="Go back one level"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                        <span>Back</span>
                    </button>
                )}

                <nav className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
                    {drilldownData?.breadcrumbs ? (
                        drilldownData.breadcrumbs.map((bc, idx) => {
                            const isLast = idx === drilldownData.breadcrumbs.length - 1;
                            return (
                                <div key={bc.id} className="flex items-center gap-1.5">
                                    {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                    {isLast ? (
                                        <span className="font-semibold text-slate-900">
                                            {bc.name}
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (bc.type === "FEDERAL") {
                                                    onNavigateToUnit(null);
                                                } else {
                                                    onNavigateToUnit(bc.id);
                                                }
                                            }}
                                            className="text-slate-600 hover:text-[#4085b3] hover:underline transition-colors cursor-pointer"
                                        >
                                            {bc.name}
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <span className="font-semibold text-slate-900">
                            Federal Ministry of Education
                        </span>
                    )}
                </nav>
            </div>

            {/* 3. SCHOOL PROFILE LEAF VIEW (When inspecting an individual School) */}
            {isSchool && drilldownData && (
                <div className="border border-slate-200 bg-white rounded p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                        <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-0.5">
                                School Profile
                            </span>
                            <h2 className="text-xl font-bold text-slate-900">
                                {drilldownData.node.name}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Located in {drilldownData.node.parentName || "subordinate woreda"}
                            </p>
                        </div>

                        <span className="px-2.5 py-1 text-xs font-medium text-slate-900 border border-slate-300 rounded bg-slate-50 self-start sm:self-auto">
                            Active Institution
                        </span>
                    </div>

                    {/* Standard Government Summary List (Clean key/value pairs) */}
                    <dl className="divide-y divide-slate-200 text-xs border-t border-b border-slate-200">
                        <div className="py-3 grid grid-cols-3 gap-2">
                            <dt className="text-slate-500 font-medium">Institution Name</dt>
                            <dd className="col-span-2 text-slate-900 font-semibold">{drilldownData.node.name}</dd>
                        </div>
                        <div className="py-3 grid grid-cols-3 gap-2">
                            <dt className="text-slate-500 font-medium">Supervising Woreda</dt>
                            <dd className="col-span-2 text-slate-900">{drilldownData.node.parentName || "—"}</dd>
                        </div>
                        <div className="py-3 grid grid-cols-3 gap-2">
                            <dt className="text-slate-500 font-medium">Enrolled Students</dt>
                            <dd className="col-span-2 text-slate-900 font-semibold tabular-nums">
                                {fmt(drilldownData.counts.studentsCount)}
                            </dd>
                        </div>
                        <div className="py-3 grid grid-cols-3 gap-2">
                            <dt className="text-slate-500 font-medium">Teaching Staff</dt>
                            <dd className="col-span-2 text-slate-900 font-semibold tabular-nums">
                                {fmt(drilldownData.counts.teachersCount)}
                            </dd>
                        </div>
                        <div className="py-3 grid grid-cols-3 gap-2">
                            <dt className="text-slate-500 font-medium">Established Year</dt>
                            <dd className="col-span-2 text-slate-900">
                                {drilldownData.schoolProfile?.establishedYear || "—"}
                            </dd>
                        </div>
                        <div className="py-3 grid grid-cols-3 gap-2">
                            <dt className="text-slate-500 font-medium">Principal / Administrator</dt>
                            <dd className="col-span-2 text-slate-900">
                                {drilldownData.admin ? (
                                    <span>
                                        <strong className="font-semibold">{drilldownData.admin.name}</strong> ({drilldownData.admin.email})
                                    </span>
                                ) : (
                                    <span className="text-slate-400">Unassigned</span>
                                )}
                            </dd>
                        </div>
                        {drilldownData.schoolProfile?.contactEmail && (
                            <div className="py-3 grid grid-cols-3 gap-2">
                                <dt className="text-slate-500 font-medium">Contact Email</dt>
                                <dd className="col-span-2 text-slate-900 font-mono">
                                    {drilldownData.schoolProfile.contactEmail}
                                </dd>
                            </div>
                        )}
                        {drilldownData.schoolProfile?.phoneNumber && (
                            <div className="py-3 grid grid-cols-3 gap-2">
                                <dt className="text-slate-500 font-medium">Phone Number</dt>
                                <dd className="col-span-2 text-slate-900">
                                    {drilldownData.schoolProfile.phoneNumber}
                                </dd>
                            </div>
                        )}
                        {drilldownData.schoolProfile?.address && (
                            <div className="py-3 grid grid-cols-3 gap-2">
                                <dt className="text-slate-500 font-medium">Physical Address</dt>
                                <dd className="col-span-2 text-slate-900">
                                    {drilldownData.schoolProfile.address}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>
            )}

            {/* 4. SUBORDINATE UNITS TABLE (When at Federal, Region, Zone, or Woreda) */}
            {!isSchool && (
                <div className="space-y-3">
                    {/* Search Toolbar */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search units by name or administrator..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    aria-label="Clear search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <span className="text-xs text-slate-500 font-medium">
                            {filteredChildren.length} {filteredChildren.length === 1 ? "unit" : "units"}
                        </span>
                    </div>

                    {/* Table (Zero horizontal scroll, zero noisy icons, neutral numbers) */}
                    <div className="border border-slate-200 bg-white rounded overflow-hidden">
                        <table className="w-full table-fixed text-left text-xs border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                                <tr>
                                    <th className="py-3 px-4 w-[28%]">Unit Name</th>
                                    <th className="py-3 px-4 w-[22%]">Sub-units</th>
                                    <th className="py-3 px-4 w-[12%]">Students</th>
                                    <th className="py-3 px-4 w-[12%]">Teachers</th>
                                    <th className="py-3 px-4 w-[16%]">Administrator</th>
                                    <th className="py-3 px-4 w-[10%] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-800">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400">
                                            <div className="inline-flex items-center gap-2">
                                                <RefreshCw className="w-4 h-4 animate-spin text-[#4085b3]" />
                                                <span>Loading directory...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredChildren.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400">
                                            No subordinate units found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredChildren.map((child) => {
                                        // Format sub-units summary
                                        const subParts: string[] = [];
                                        if (child.zonesCount !== undefined && child.zonesCount > 0) {
                                            subParts.push(`${child.zonesCount} zones`);
                                        }
                                        if (child.woredasCount !== undefined && child.woredasCount > 0) {
                                            subParts.push(`${child.woredasCount} woredas`);
                                        }
                                        if (child.schoolsCount !== undefined && child.schoolsCount > 0) {
                                            subParts.push(`${child.schoolsCount} schools`);
                                        }
                                        const subUnitsText = subParts.length > 0 ? subParts.join(", ") : "—";

                                        return (
                                            <tr
                                                key={child.id}
                                                onClick={() => onNavigateToUnit(child.id)}
                                                className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                            >
                                                {/* Unit Name (Plain bold text, zero noisy icons) */}
                                                <td className="py-3.5 px-4 truncate">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <span className="font-semibold text-slate-900 truncate">
                                                            {child.name}
                                                        </span>
                                                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                                            {child.type}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Sub-units */}
                                                <td className="py-3.5 px-4 text-slate-600 truncate">
                                                    {subUnitsText}
                                                </td>

                                                {/* Students (Neutral, plain dark text) */}
                                                <td className="py-3.5 px-4 text-slate-900 font-medium tabular-nums truncate">
                                                    {fmt(child.studentsCount)}
                                                </td>

                                                {/* Teachers (Neutral, plain dark text) */}
                                                <td className="py-3.5 px-4 text-slate-900 font-medium tabular-nums truncate">
                                                    {fmt(child.teachersCount)}
                                                </td>

                                                {/* Administrator */}
                                                <td className="py-3.5 px-4 truncate">
                                                    {child.admin ? (
                                                        <div className="truncate">
                                                            <span className="font-medium text-slate-900 block truncate">
                                                                {child.admin.name}
                                                            </span>
                                                            <span className="text-[11px] text-slate-500 block truncate">
                                                                {child.admin.email}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">Unassigned</span>
                                                    )}
                                                </td>

                                                {/* Action */}
                                                <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => onNavigateToUnit(child.id)}
                                                        className="text-xs font-semibold text-[#4085b3] hover:underline cursor-pointer"
                                                    >
                                                        Explore ↗
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
