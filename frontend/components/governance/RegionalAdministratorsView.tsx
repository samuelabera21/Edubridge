"use client";

import React, { useState, useMemo } from "react";
import {
    Search,
    Plus,
    X,
    CheckCircle2,
    AlertCircle,
    Copy,
    Download,
    ArrowUpRight,
    Loader2
} from "lucide-react";
import * as XLSX from "xlsx";
import { fetchApi } from "../../lib/api";

export interface RegionAdmin {
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INVITATION_PENDING";
    invitedAt?: string;
    roleName: string;
    phone?: string;
}

export interface RegionItem {
    id: string;
    name: string;
    type: "REGION";
    parentId: string | null;
    zonesCount: number;
    woredasCount: number;
    schoolsCount: number;
    studentsCount?: number;
    teachersCount?: number;
    admin: RegionAdmin | null;
}

export interface RegionalAdministratorsViewProps {
    regions: any[];
    onRefresh?: () => Promise<void> | void;
    onNavigateToRegion?: (regionId: string) => void;
    title?: string;
    unitTypeLabel?: string;
    apiEndpointPrefix?: "regions" | "zones" | "woredas" | "schools";
}

export default function RegionalAdministratorsView({
    regions,
    onRefresh,
    onNavigateToRegion,
    title,
    unitTypeLabel,
    apiEndpointPrefix
}: RegionalAdministratorsViewProps) {
    const resolvedTitle = title || "Regional administrators";
    const resolvedUnitLabel = unitTypeLabel || "Region";
    const apiPrefix = apiEndpointPrefix || "regions";

    // Search & Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PENDING" | "VACANT">("ALL");

    // Drawer state (inspecting a jurisdiction and officer)
    const [inspectingRegion, setInspectingRegion] = useState<RegionItem | null>(null);

    // Appointment Modal State
    const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
    const [appointRegionId, setAppointRegionId] = useState<string>("");
    const [appointFullName, setAppointFullName] = useState("");
    const [appointEmail, setAppointEmail] = useState("");
    const [appointPhone, setAppointPhone] = useState("");
    const [appointLoading, setAppointLoading] = useState(false);
    const [appointError, setAppointError] = useState<string | null>(null);

    // Reset Password Modal State
    const [resetCreds, setResetCreds] = useState<{ email: string; temporaryPassword: string; regionName: string } | null>(null);
    const [actionLoading, setActionLoading] = useState<{ id: string; action: "reset" | "resend" | "revoke" } | null>(null);
    const [copiedPassword, setCopiedPassword] = useState(false);

    // Feedback Toast / Notification
    const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Quick Stats Calculation
    const metrics = useMemo(() => {
        let active = 0;
        let pending = 0;
        let vacant = 0;

        for (const r of regions) {
            if (!r.admin) {
                vacant++;
            } else if (r.admin.status === "ACTIVE") {
                active++;
            } else {
                pending++;
            }
        }

        return {
            total: regions.length,
            active,
            pending,
            vacant
        };
    }, [regions]);

    // Filtered Regions
    const filteredRegions = useMemo(() => {
        return regions.filter((region) => {
            // Status Filter
            if (statusFilter === "ACTIVE" && region.admin?.status !== "ACTIVE") return false;
            if (statusFilter === "PENDING" && region.admin?.status !== "INVITATION_PENDING") return false;
            if (statusFilter === "VACANT" && region.admin !== null) return false;

            // Search Query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchRegion = region.name.toLowerCase().includes(q);
                const matchAdminName = region.admin?.name?.toLowerCase().includes(q) || false;
                const matchAdminEmail = region.admin?.email?.toLowerCase().includes(q) || false;
                const matchAdminPhone = region.admin?.phone?.toLowerCase().includes(q) || false;

                if (!matchRegion && !matchAdminName && !matchAdminEmail && !matchAdminPhone) {
                    return false;
                }
            }

            return true;
        });
    }, [regions, statusFilter, searchQuery]);

    // Open Appoint Modal
    const handleOpenAppoint = (presetRegionId?: string) => {
        const targetId = presetRegionId || (regions.find((r) => !r.admin)?.id || regions[0]?.id || "");
        setAppointRegionId(targetId);
        setAppointFullName("");
        setAppointEmail("");
        setAppointPhone("");
        setAppointError(null);
        setAppointmentModalOpen(true);
    };

    // Submit Appoint Regional Administrator
    const handleSubmitAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!appointRegionId || !appointFullName.trim() || !appointEmail.trim()) {
            setAppointError("Please fill in all required fields.");
            return;
        }

        setAppointLoading(true);
        setAppointError(null);
        try {
            const res = await fetchApi(`/hierarchy/${apiPrefix}/${appointRegionId}/assign-admin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: appointFullName.trim(),
                    email: appointEmail.trim(),
                    phone: appointPhone.trim() || undefined
                })
            });

            const resJson = await res.json();
            if (!res.ok) {
                throw new Error(resJson.message || "Failed to appoint administrator");
            }

            setActionNotice({
                type: "success",
                message: `Invitation successfully sent to ${appointEmail.trim()}.`
            });

            setAppointmentModalOpen(false);
            if (onRefresh) await onRefresh();

            if (inspectingRegion && inspectingRegion.id === appointRegionId) {
                const updated = regions.find((r) => r.id === appointRegionId);
                if (updated) setInspectingRegion(updated);
            }
        } catch (err: any) {
            setAppointError(err.message || `Failed to appoint ${resolvedUnitLabel.toLowerCase()} administrator`);
        } finally {
            setAppointLoading(false);
        }
    };

    // Reset Regional Admin Password
    const handleResetPassword = async (regionId: string, regionName: string) => {
        if (!confirm(`Reset the password for ${regionName}'s administrator? Their active sessions will be terminated.`)) {
            return;
        }

        setActionLoading({ id: regionId, action: "reset" });
        try {
            const res = await fetchApi(`/hierarchy/${apiPrefix}/${regionId}/reset-admin-password`, {
                method: "POST"
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Failed to reset password");

            setResetCreds({
                email: result.email,
                temporaryPassword: result.temporaryPassword,
                regionName
            });

            setActionNotice({
                type: "success",
                message: `Password reset successfully for ${regionName}. Share temporary credentials privately.`
            });
        } catch (err: any) {
            setActionNotice({
                type: "error",
                message: err.message || "Failed to reset administrator password"
            });
        } finally {
            setActionLoading(null);
        }
    };

    // Resend Invitation
    const handleResendInvite = async (regionId: string) => {
        setActionLoading({ id: regionId, action: "resend" });
        try {
            const res = await fetchApi(`/hierarchy/${apiPrefix}/${regionId}/resend-invitation`, {
                method: "POST"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to resend invitation");

            setActionNotice({
                type: "success",
                message: resJson.message || "Invitation resent successfully."
            });
            if (onRefresh) await onRefresh();
        } catch (err: any) {
            setActionNotice({
                type: "error",
                message: err.message || "Failed to resend invitation"
            });
        } finally {
            setActionLoading(null);
        }
    };

    // Revoke / Cancel Invitation
    const handleRevoke = async (regionId: string, regionName: string) => {
        if (!confirm(`Are you sure you want to revoke the administrator appointment for ${regionName}?`)) {
            return;
        }

        setActionLoading({ id: regionId, action: "revoke" });
        try {
            const res = await fetchApi(`/hierarchy/${apiPrefix}/${regionId}/cancel-invitation`, {
                method: "DELETE"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to revoke appointment");

            setActionNotice({
                type: "success",
                message: `Appointment revoked for ${regionName}.`
            });
            if (inspectingRegion && inspectingRegion.id === regionId) {
                setInspectingRegion(null);
            }
            if (onRefresh) await onRefresh();
        } catch (err: any) {
            setActionNotice({
                type: "error",
                message: err.message || "Failed to revoke appointment"
            });
        } finally {
            setActionLoading(null);
        }
    };

    // Export Official Roster (.xlsx)
    const handleExportRoster = () => {
        const rows = regions.map((r) => ({
            [resolvedUnitLabel]: r.name,
            "Administrator": r.admin?.name || "Unassigned",
            "Email": r.admin?.email || "—",
            "Status": r.admin ? (r.admin.status === "ACTIVE" ? "Active" : "Pending invite") : "Vacant",
            "Zones": r.zonesCount,
            "Woredas": r.woredasCount,
            "Schools": r.schoolsCount,
            "Students": r.studentsCount || 0,
            "Teachers": r.teachersCount || 0
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        ws["!cols"] = [
            { wch: 22 },
            { wch: 22 },
            { wch: 26 },
            { wch: 18 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 12 },
            { wch: 12 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, resolvedTitle);
        XLSX.writeFile(wb, `${resolvedTitle.replace(/\s+/g, "_")}.xlsx`);
    };

    return (
        <div className="space-y-6 font-sans text-slate-900 max-w-7xl">
            {/* 1. PAGE HEADER (Clean single-line header matching Policies and Data Requests UI) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {resolvedTitle}
                </h1>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={handleExportRoster}
                        className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3] text-sm font-medium rounded transition-all duration-200 inline-flex items-center gap-1.5 cursor-pointer group/export"
                        title="Export roster as spreadsheet"
                    >
                        <Download className="w-4 h-4 text-slate-500 group-hover/export:text-white transition-colors" />
                        <span>Export roster</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpenAppoint()}
                        className="px-3.5 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-sm font-medium rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Appoint administrator</span>
                    </button>
                </div>
            </div>

            {/* Notification Banner */}
            {actionNotice && (
                <div
                    role="status"
                    className={`p-3 text-xs flex items-center justify-between border rounded ${
                        actionNotice.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                            : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {actionNotice.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{actionNotice.message}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setActionNotice(null)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                        aria-label="Dismiss banner"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* 2. TOOLBAR: SEARCH & STATUS FILTER (Unified in one clean row) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder={`Search by ${resolvedUnitLabel.toLowerCase()}, administrator, or email...`}
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

                <div className="flex items-center gap-2">
                    <label htmlFor="admin-status-filter" className="text-xs font-medium text-slate-600">
                        Status:
                    </label>
                    <select
                        id="admin-status-filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="text-xs bg-white border border-slate-300 rounded px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-[#4085b3] cursor-pointer"
                    >
                        <option value="ALL">All {resolvedUnitLabel.toLowerCase()}s ({metrics.total})</option>
                        <option value="ACTIVE">Active ({metrics.active})</option>
                        <option value="PENDING">Pending invite ({metrics.pending})</option>
                        <option value="VACANT">Vacant ({metrics.vacant})</option>
                    </select>
                </div>
            </div>

            {/* 3. ROSTER TABLE (Zero horizontal scroll, zero noisy icons, zero colored texts) */}
            <div className="border border-slate-200 bg-white rounded overflow-hidden">
                <table className="w-full table-fixed text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                        <tr>
                            <th className="py-3 px-4 w-[26%]">{resolvedUnitLabel}</th>
                            <th className="py-3 px-4 w-[32%]">Administrator</th>
                            <th className="py-3 px-4 w-[20%]">Sub-units</th>
                            <th className="py-3 px-4 w-[12%]">Status</th>
                            <th className="py-3 px-4 w-[10%] text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                        {filteredRegions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400">
                                    No {resolvedUnitLabel.toLowerCase()}s found matching criteria.
                                </td>
                            </tr>
                        ) : (
                            filteredRegions.map((region) => {
                                const admin = region.admin;
                                const isVacant = !admin;
                                const isPending = admin?.status === "INVITATION_PENDING";
                                const isActive = admin?.status === "ACTIVE";

                                const subParts = [];
                                if (region.zonesCount && region.zonesCount > 0) subParts.push(`${region.zonesCount} ${region.zonesCount === 1 ? "zone" : "zones"}`);
                                if (region.woredasCount && region.woredasCount > 0) subParts.push(`${region.woredasCount} ${region.woredasCount === 1 ? "woreda" : "woredas"}`);
                                if (region.schoolsCount && region.schoolsCount > 0) subParts.push(`${region.schoolsCount} ${region.schoolsCount === 1 ? "school" : "schools"}`);
                                const subUnitsText = subParts.length > 0 ? subParts.join(", ") : "—";

                                return (
                                    <tr
                                        key={region.id}
                                        onClick={() => setInspectingRegion(region)}
                                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                    >
                                        {/* Region Name */}
                                        <td className="py-3.5 px-4 font-semibold text-slate-900 truncate">
                                            {region.name}
                                        </td>

                                        {/* Administrator */}
                                        <td className="py-3.5 px-4 truncate">
                                            {isVacant ? (
                                                <span className="text-slate-400">Unassigned</span>
                                            ) : (
                                                <div>
                                                    <span className="font-medium text-slate-900 block truncate">
                                                        {admin.name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500 block truncate">
                                                        {admin.email}
                                                    </span>
                                                </div>
                                            )}
                                        </td>

                                        {/* Sub-units */}
                                        <td className="py-3.5 px-4 text-slate-600 truncate">
                                            {subUnitsText}
                                        </td>

                                        {/* Status */}
                                        <td className="py-3.5 px-4">
                                            {isActive && (
                                                <span className="text-slate-900 font-medium">Active</span>
                                            )}
                                            {isPending && (
                                                <span className="text-slate-600 font-medium">Pending invite</span>
                                            )}
                                            {isVacant && (
                                                <span className="text-slate-400 font-medium">Vacant</span>
                                            )}
                                        </td>

                                        {/* Action */}
                                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            {isVacant ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenAppoint(region.id)}
                                                    className="text-xs font-semibold text-[#4085b3] hover:underline cursor-pointer"
                                                >
                                                    Appoint ↗
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setInspectingRegion(region)}
                                                    className="text-xs font-semibold text-[#4085b3] hover:underline cursor-pointer"
                                                >
                                                    Manage ↗
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* 4. SLIDE-OUT INSPECTION DRAWER (Clean Gov Dossier) */}
            {inspectingRegion && (
                <div
                    className="fixed inset-0 z-50 overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="dossier-title"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 transition-opacity"
                        onClick={() => setInspectingRegion(null)}
                    />

                    {/* Drawer Panel */}
                    <div className="fixed inset-y-0 right-0 max-w-lg w-full bg-white shadow-xl flex flex-col z-50 border-l border-slate-200 overflow-hidden font-sans">
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-slate-200 bg-white flex items-start justify-between gap-4 shrink-0">
                            <div>
                                <h2 id="dossier-title" className="text-xl font-bold text-slate-900">
                                    {inspectingRegion.name}
                                </h2>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {resolvedUnitLabel} administration profile
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setInspectingRegion(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900 text-xs">
                            {/* Officer Profile Section */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                    Administrator details
                                </h3>

                                {inspectingRegion.admin ? (
                                    <dl className="divide-y divide-slate-200 border-t border-b border-slate-200">
                                        <div className="py-2.5 grid grid-cols-3 gap-2">
                                            <dt className="text-slate-500 font-medium">Officer name</dt>
                                            <dd className="col-span-2 text-slate-900 font-semibold">{inspectingRegion.admin.name}</dd>
                                        </div>
                                        <div className="py-2.5 grid grid-cols-3 gap-2">
                                            <dt className="text-slate-500 font-medium">Official email</dt>
                                            <dd className="col-span-2 text-slate-900">{inspectingRegion.admin.email}</dd>
                                        </div>
                                        {inspectingRegion.admin.phone && (
                                            <div className="py-2.5 grid grid-cols-3 gap-2">
                                                <dt className="text-slate-500 font-medium">Phone number</dt>
                                                <dd className="col-span-2 text-slate-900">{inspectingRegion.admin.phone}</dd>
                                            </div>
                                        )}
                                        <div className="py-2.5 grid grid-cols-3 gap-2">
                                            <dt className="text-slate-500 font-medium">Role</dt>
                                            <dd className="col-span-2 text-slate-900">
                                                {inspectingRegion.admin.roleName || "Regional Administrator"}
                                            </dd>
                                        </div>
                                        <div className="py-2.5 grid grid-cols-3 gap-2">
                                            <dt className="text-slate-500 font-medium">Status</dt>
                                            <dd className="col-span-2">
                                                {inspectingRegion.admin.status === "ACTIVE" ? (
                                                    <span className="font-medium text-slate-900">Active</span>
                                                ) : (
                                                    <span className="font-medium text-slate-600">Pending invite</span>
                                                )}
                                            </dd>
                                        </div>
                                    </dl>
                                ) : (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-2">
                                        <p className="font-medium text-slate-800">No administrator appointed</p>
                                        <p className="text-slate-500 text-xs">
                                            This post is currently vacant.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const id = inspectingRegion.id;
                                                setInspectingRegion(null);
                                                handleOpenAppoint(id);
                                            }}
                                            className="px-3 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-medium rounded cursor-pointer transition-colors mt-1"
                                        >
                                            Appoint administrator
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Regional Coverage Section */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                    Regional coverage
                                </h3>

                                <div className="py-2.5 border-t border-b border-slate-200 text-slate-700 flex items-center justify-between">
                                    <span>
                                        {inspectingRegion.zonesCount} zones, {inspectingRegion.woredasCount} woredas, {inspectingRegion.schoolsCount} schools
                                    </span>
                                    {onNavigateToRegion && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const id = inspectingRegion.id;
                                                setInspectingRegion(null);
                                                onNavigateToRegion(id);
                                            }}
                                            className="text-xs font-semibold text-[#4085b3] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                        >
                                            <span>Explore hierarchy</span>
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Actions / Session Controls */}
                            {inspectingRegion.admin && (
                                <div className="space-y-3 pt-2">
                                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                                        Actions
                                    </h3>

                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        {apiPrefix === "regions" && (
                                            <button
                                                type="button"
                                                onClick={() => handleResetPassword(inspectingRegion.id, inspectingRegion.name)}
                                                disabled={actionLoading?.id === inspectingRegion.id}
                                                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded cursor-pointer transition-colors"
                                            >
                                                {actionLoading?.id === inspectingRegion.id && actionLoading.action === "reset" ? "Resetting..." : "Reset password"}
                                            </button>
                                        )}

                                        {inspectingRegion.admin.status === "INVITATION_PENDING" && (
                                            <button
                                                type="button"
                                                onClick={() => handleResendInvite(inspectingRegion.id)}
                                                disabled={actionLoading?.id === inspectingRegion.id}
                                                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded cursor-pointer transition-colors"
                                            >
                                                {actionLoading?.id === inspectingRegion.id && actionLoading.action === "resend" ? "Resending..." : "Resend invite"}
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleRevoke(inspectingRegion.id, inspectingRegion.name)}
                                            disabled={actionLoading?.id === inspectingRegion.id}
                                            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-rose-50 text-rose-700 text-xs font-medium rounded cursor-pointer transition-colors ml-auto"
                                        >
                                            {actionLoading?.id === inspectingRegion.id && actionLoading.action === "revoke" ? "Revoking..." : "Revoke appointment"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 5. APPOINTMENT MODAL */}
            {appointmentModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="appoint-modal-title"
                >
                    <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 font-sans text-slate-900">
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                            <div>
                                <h3 id="appoint-modal-title" className="text-base font-bold text-slate-900">
                                    Appoint administrator
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Assign an administrator to a {resolvedUnitLabel.toLowerCase()}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAppointmentModalOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {appointError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 rounded">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{appointError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmitAppointment} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Region <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={appointRegionId}
                                    onChange={(e) => setAppointRegionId(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                >
                                    {regions.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name} {!r.admin ? "(Vacant)" : `(Current: ${r.admin.name})`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Full name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Samuel Abera"
                                    value={appointFullName}
                                    onChange={(e) => setAppointFullName(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Email address <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g. samuel@amhara.gov.et"
                                    value={appointEmail}
                                    onChange={(e) => setAppointEmail(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Phone number (optional)
                                </label>
                                <input
                                    type="tel"
                                    placeholder="e.g. +251 91 123 4567"
                                    value={appointPhone}
                                    onChange={(e) => setAppointPhone(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setAppointmentModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={appointLoading || !appointFullName.trim() || !appointEmail.trim()}
                                    className="px-4 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-semibold rounded transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                                >
                                    {appointLoading ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Sending invitation...</span>
                                        </>
                                    ) : (
                                        <span>Send invitation</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 6. TEMPORARY PASSWORD MODAL */}
            {resetCreds && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="reset-modal-title"
                >
                    <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 font-sans text-slate-900">
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                            <div>
                                <h3 id="reset-modal-title" className="text-base font-bold text-slate-900">
                                    Temporary password generated
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {resetCreds.regionName} administrator
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setResetCreds(null);
                                    setCopiedPassword(false);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <p className="text-slate-600">
                                Share this temporary password securely with <strong className="text-slate-900">{resetCreds.email}</strong>. They will be prompted to choose a new password upon signing in.
                            </p>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                                <span className="font-mono text-sm font-bold text-slate-900 select-all">
                                    {resetCreds.temporaryPassword}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(resetCreds.temporaryPassword);
                                        setCopiedPassword(true);
                                        setTimeout(() => setCopiedPassword(false), 2000);
                                    }}
                                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 text-xs font-medium cursor-pointer inline-flex items-center gap-1"
                                >
                                    {copiedPassword ? (
                                        <>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                                            <span>Copy</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end pt-3 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={() => {
                                    setResetCreds(null);
                                    setCopiedPassword(false);
                                }}
                                className="px-4 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-semibold rounded cursor-pointer transition-colors"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
