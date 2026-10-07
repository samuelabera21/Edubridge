"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    Building2,
    MapPin,
    School,
    Plus,
    UserPlus,
    RefreshCw,
    Search,
    CheckCircle2,
    AlertCircle,
    UserCheck,
    ArrowUpRight,
    ArrowLeft,
    X,
    Info,
    ChevronRight,
    Users,
    GraduationCap,
    Phone,
    Mail,
    Calendar,
    Shield,
    FileText,
    Megaphone,
    Paperclip,
    Eye,
    Check,
    ExternalLink,
    Clock,
    CheckSquare,
    Compass
} from "lucide-react";
import DirectivesRecipientView from "./DirectivesRecipientView";
import RegionalAnnouncementPublishView from "./RegionalAnnouncementPublishView";
import ProgramsRegistryView from "./ProgramsRegistryView";

export interface ZoneAdmin {
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INVITATION_PENDING";
    invitedAt?: string;
    roleName: string;
}

export interface ZoneItem {
    id: string;
    name: string;
    type: "ZONE";
    parentId: string | null;
    woredasCount: number;
    schoolsCount: number;
    admin: ZoneAdmin | null;
}

export interface RegionOverviewData {
    regionId: string | null;
    regionName: string;
    parentFederalName: string;
    counts: {
        totalZones: number;
        totalWoredas: number;
        totalSchools: number;
    };
    zones: ZoneItem[];
}

export interface DrilldownBreadcrumb {
    id: string;
    name: string;
    type: "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";
}

export interface DrilldownChildItem {
    id: string;
    name: string;
    type: "REGION" | "ZONE" | "WOREDA" | "SCHOOL";
    parentId: string | null;
    zonesCount?: number;
    woredasCount?: number;
    schoolsCount?: number;
    studentsCount: number;
    teachersCount: number;
    admin: {
        id: string;
        name: string;
        email: string;
        status: "ACTIVE" | "INVITATION_PENDING";
        roleName: string;
    } | null;
    schoolProfile?: {
        address: string | null;
        phoneNumber: string | null;
        contactEmail: string | null;
        establishedYear: number | null;
        status: string;
    } | null;
}

export interface DrilldownData {
    node: {
        id: string;
        name: string;
        type: "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";
        parentId: string | null;
        parentName: string | null;
    };
    counts: {
        totalRegions?: number;
        zonesCount?: number;
        woredasCount?: number;
        schoolsCount?: number;
        studentsCount: number;
        teachersCount: number;
    };
    admin: {
        id: string;
        name: string;
        email: string;
        status: "ACTIVE" | "INVITATION_PENDING";
        invitedAt?: string;
        roleName: string;
    } | null;
    schoolProfile?: {
        address: string | null;
        phoneNumber: string | null;
        contactEmail: string | null;
        establishedYear: number | null;
        status: string;
    } | null;
    breadcrumbs: DrilldownBreadcrumb[];
    children: DrilldownChildItem[];
}

export default function RegionalDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams?.get("tab") || "overview";
    const targetOrgId = searchParams?.get("targetOrgId");
    const unitIdParam = searchParams?.get("unitId") || null;

    const [data, setData] = useState<RegionOverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Drilldown specific state
    const [drilldownData, setDrilldownData] = useState<DrilldownData | null>(null);
    const [drilldownLoading, setDrilldownLoading] = useState(false);
    const [drilldownError, setDrilldownError] = useState<string | null>(null);
    const [drilldownSearch, setDrilldownSearch] = useState("");

    // Selected / Hovered Zone on Map
    const [hoveredZone, setHoveredZone] = useState<ZoneItem | null>(null);

    // Modal State: Create Zone
    const [createZoneOpen, setCreateZoneOpen] = useState(false);
    const [newZoneName, setNewZoneName] = useState("");
    const [newZoneCode, setNewZoneCode] = useState("");
    const [creatingZone, setCreatingZone] = useState(false);
    const [createZoneMessage, setCreateZoneMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Modal State: Assign Zone Administrator
    const [assignAdminOpen, setAssignAdminOpen] = useState(false);
    const [selectedZoneForAdmin, setSelectedZoneForAdmin] = useState<ZoneItem | null>(null);
    const [adminFullName, setAdminFullName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPhone, setAdminPhone] = useState("");
    const [assigningAdmin, setAssigningAdmin] = useState(false);
    const [assignAdminMessage, setAssignAdminMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Action state for resend/cancel
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Directives & Announcements state
    const [directivesList, setDirectivesList] = useState<any[]>([]);
    const [directivesLoading, setDirectivesLoading] = useState(false);
    const [directivesError, setDirectivesError] = useState<string | null>(null);
    const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);
    const [directiveSubTab, setDirectiveSubTab] = useState<"ISSUED" | "INCOMING">("ISSUED");
    const [directiveSearch, setDirectiveSearch] = useState("");
    const [selectedDirectiveForLedger, setSelectedDirectiveForLedger] = useState<any | null>(null);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    // Acknowledgment dialog state for incoming federal directives
    const [ackModalDirective, setAckModalDirective] = useState<any | null>(null);
    const [ackNotes, setAckNotes] = useState("");
    const [ackConfirmed, setAckConfirmed] = useState(false);
    const [ackSubmitting, setAckSubmitting] = useState(false);

    const loadDirectives = async () => {
        setDirectivesLoading(true);
        setDirectivesError(null);
        try {
            const res = await fetchApi("/directives");
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to fetch directives and announcements");
            }
            const payload = await res.json();
            setDirectivesList(payload.data || []);
        } catch (err: any) {
            setDirectivesError(err.message || "Failed to load directives");
        } finally {
            setDirectivesLoading(false);
        }
    };

    const loadDirectiveLedger = async (id: string) => {
        setLedgerLoading(true);
        try {
            const res = await fetchApi(`/directives/${id}`);
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load delivery ledger");
            }
            const payload = await res.json();
            setSelectedDirectiveForLedger(payload.data);
        } catch (err: any) {
            showToast("error", err.message || "Failed to load delivery status");
        } finally {
            setLedgerLoading(false);
        }
    };

    const handleAcknowledgeDirective = async () => {
        if (!ackModalDirective) return;
        if (!ackConfirmed) {
            showToast("error", "Please check the confirmation box to confirm receipt.");
            return;
        }
        setAckSubmitting(true);
        try {
            const res = await fetchApi(`/directives/${ackModalDirective.id}/acknowledge`, {
                method: "POST",
                body: JSON.stringify({ notes: ackNotes.trim() || undefined })
            });
            if (res.ok) {
                showToast("success", "Official receipt confirmation recorded.");
                setAckModalDirective(null);
                setAckNotes("");
                setAckConfirmed(false);
                loadDirectives();
            } else {
                const errJson = await res.json().catch(() => ({}));
                showToast("error", errJson.message || "Failed to confirm receipt.");
            }
        } catch (err: any) {
            showToast("error", err.message || "Network error occurred.");
        } finally {
            setAckSubmitting(false);
        }
    };

    const loadRegionData = async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = targetOrgId
                ? `/hierarchy/regions/${targetOrgId}/overview`
                : `/hierarchy/region/overview`;
            const res = await fetchApi(endpoint);
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load Regional Overview");
            }
            const payload = await res.json();
            setData(payload.data);
            if (payload.data?.zones && payload.data.zones.length > 0) {
                setHoveredZone(payload.data.zones[0]);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch Regional dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const loadDrilldownData = async (targetId?: string | null) => {
        setDrilldownLoading(true);
        setDrilldownError(null);
        try {
            const effectiveId = targetId || targetOrgId || undefined;
            const endpoint = effectiveId ? `/hierarchy/drilldown/${effectiveId}` : `/hierarchy/drilldown`;
            const res = await fetchApi(endpoint);
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load hierarchy drill-down");
            }
            const payload = await res.json();
            setDrilldownData(payload.data);
        } catch (err: any) {
            setDrilldownError(err.message || "Failed to load hierarchy drill-down data");
        } finally {
            setDrilldownLoading(false);
        }
    };

    useEffect(() => {
        loadRegionData();
    }, [targetOrgId]);

    useEffect(() => {
        if (currentTab === "zones" || unitIdParam) {
            loadDrilldownData(unitIdParam);
        }
        if (currentTab === "directives") {
            loadDirectives();
        }
    }, [currentTab, unitIdParam, targetOrgId]);

    const showToast = (type: "success" | "error", text: string) => {
        setToastMessage({ type, text });
        setTimeout(() => setToastMessage(null), 3500);
    };

    const targetParam = targetOrgId ? `&targetOrgId=${targetOrgId}` : "";
    const targetQueryOnly = targetOrgId ? `?targetOrgId=${targetOrgId}` : "";

    // Navigation inside regional dashboard for hierarchy drill-down
    const navigateToUnit = (unitId?: string | null) => {
        setDrilldownSearch("");
        if (unitId) {
            router.push(`/dashboard/region?tab=zones&unitId=${unitId}${targetParam}`);
        } else {
            router.push(`/dashboard/region?tab=zones${targetParam}`);
        }
    };

    const navigateBack = () => {
        if (!drilldownData || drilldownData.breadcrumbs.length <= 1) {
            navigateToUnit(null);
            return;
        }
        // Breadcrumbs contain lineage. If root is Region, length 1 is Region itself.
        const prevIndex = drilldownData.breadcrumbs.length - 2;
        if (prevIndex >= 0) {
            const targetAncestor = drilldownData.breadcrumbs[prevIndex];
            if (targetAncestor.type === "REGION") {
                navigateToUnit(null);
            } else {
                navigateToUnit(targetAncestor.id);
            }
        } else {
            navigateToUnit(null);
        }
    };

    // Filter zones by search query
    const filteredZones = useMemo(() => {
        if (!data?.zones) return [];
        if (!searchQuery.trim()) return data.zones;
        const q = searchQuery.toLowerCase();
        return data.zones.filter(
            z =>
                z.name.toLowerCase().includes(q) ||
                (z.admin?.name && z.admin.name.toLowerCase().includes(q)) ||
                (z.admin?.email && z.admin.email.toLowerCase().includes(q))
        );
    }, [data?.zones, searchQuery]);

    // Filter drilldown children by drilldownSearch
    const filteredDrilldownChildren = useMemo(() => {
        if (!drilldownData?.children) return [];
        if (!drilldownSearch.trim()) return drilldownData.children;
        const q = drilldownSearch.toLowerCase();
        return drilldownData.children.filter(
            c =>
                c.name.toLowerCase().includes(q) ||
                (c.admin?.name && c.admin.name.toLowerCase().includes(q)) ||
                (c.admin?.email && c.admin.email.toLowerCase().includes(q))
        );
    }, [drilldownData?.children, drilldownSearch]);

    // Extract all administrators for Administration tab
    const assignedAdministrators = useMemo(() => {
        if (!data?.zones) return [];
        return data.zones
            .filter(z => z.admin !== null)
            .map(z => ({
                zoneId: z.id,
                zoneName: z.name,
                admin: z.admin!
            }));
    }, [data?.zones]);

    // Split directives into Issued by Region vs Incoming from Federal
    const issuedDirectives = useMemo(() => {
        return directivesList.filter((d: any) => d.isIssuedByMe);
    }, [directivesList]);

    const incomingDirectives = useMemo(() => {
        return directivesList.filter((d: any) => !d.isIssuedByMe);
    }, [directivesList]);

    const filteredDirectives = useMemo(() => {
        const list = directiveSubTab === "ISSUED" ? issuedDirectives : incomingDirectives;
        if (!directiveSearch.trim()) return list;
        const q = directiveSearch.toLowerCase();
        return list.filter(
            (d: any) =>
                d.title?.toLowerCase().includes(q) ||
                d.content?.toLowerCase().includes(q) ||
                d.code?.toLowerCase().includes(q)
        );
    }, [directiveSubTab, issuedDirectives, incomingDirectives, directiveSearch]);

    // Format number helper
    const fmt = (num: number | undefined | null) => {
        if (num === undefined || num === null) return "0";
        return num.toLocaleString();
    };

    // Calculate real proportions for Card 1
    const totalSchools = data?.counts?.totalSchools ?? 0;
    const totalWoredas = data?.counts?.totalWoredas ?? 0;
    const totalZones = data?.counts?.totalZones ?? 0;
    const totalSubordinateUnits = totalZones + totalWoredas;
    const totalEntities = totalSchools + totalSubordinateUnits;
    const schoolsPercentage = totalEntities > 0 ? ((totalSchools / totalEntities) * 100).toFixed(1) : "100.0";
    const subUnitsPercentage = totalEntities > 0 ? ((totalSubordinateUnits / totalEntities) * 100).toFixed(1) : "0.0";

    const realZones = data?.zones ?? [];
    const maxSchoolsCount = useMemo(() => {
        if (realZones.length === 0) return 5;
        const max = Math.max(...realZones.map(z => z.schoolsCount));
        return Math.max(max, 4);
    }, [realZones]);

    // Generate clean step values for Y-axis
    const yAxisSteps = useMemo(() => {
        const top = Math.ceil(maxSchoolsCount);
        const step = Math.max(1, Math.ceil(top / 4));
        const steps = [];
        for (let i = top; i >= 0; i -= step) {
            steps.push(i);
        }
        if (steps[steps.length - 1] !== 0) {
            steps.push(0);
        }
        return steps;
    }, [maxSchoolsCount]);

    // Handle Create Zone Submit
    const handleCreateZoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const effectiveRegionId = data?.regionId || targetOrgId;
        if (!newZoneName.trim() || !effectiveRegionId) return;

        setCreatingZone(true);
        setCreateZoneMessage(null);
        try {
            const res = await fetchApi("/hierarchy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newZoneName.trim(),
                    type: "ZONE",
                    parentId: effectiveRegionId,
                    code: newZoneCode.trim() || undefined
                })
            });

            const resJson = await res.json();
            if (!res.ok) {
                throw new Error(resJson.message || "Failed to create Zone");
            }

            setCreateZoneMessage({
                type: "success",
                text: `Zone "${newZoneName.trim()}" created successfully.`
            });

            await Promise.all([loadRegionData(), loadDrilldownData(unitIdParam)]);

            setTimeout(() => {
                setCreateZoneOpen(false);
                setNewZoneName("");
                setNewZoneCode("");
                setCreateZoneMessage(null);
            }, 800);
        } catch (err: any) {
            setCreateZoneMessage({
                type: "error",
                text: err.message || "Could not create Zone"
            });
        } finally {
            setCreatingZone(false);
        }
    };

    // Open Assign Admin Modal
    const openAssignAdmin = (zone: { id: string; name: string }) => {
        setSelectedZoneForAdmin(zone as ZoneItem);
        setAdminFullName("");
        setAdminEmail("");
        setAdminPhone("");
        setAssignAdminMessage(null);
        setAssignAdminOpen(true);
    };

    // Handle Assign Zone Admin Submit
    const handleAssignAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedZoneForAdmin || !adminFullName.trim() || !adminEmail.trim()) return;

        setAssigningAdmin(true);
        setAssignAdminMessage(null);
        try {
            const res = await fetchApi(`/hierarchy/zones/${selectedZoneForAdmin.id}/assign-admin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: adminFullName.trim(),
                    email: adminEmail.trim(),
                    phone: adminPhone.trim() || undefined
                })
            });

            const resJson = await res.json();
            if (!res.ok) {
                throw new Error(resJson.message || "Failed to send invitation");
            }

            setAssignAdminMessage({
                type: "success",
                text: `Invitation sent to ${adminEmail.trim()}.`
            });

            await Promise.all([loadRegionData(), loadDrilldownData(unitIdParam)]);

            setTimeout(() => {
                setAssignAdminOpen(false);
                setSelectedZoneForAdmin(null);
                setAdminFullName("");
                setAdminEmail("");
                setAdminPhone("");
                setAssignAdminMessage(null);
            }, 1000);
        } catch (err: any) {
            setAssignAdminMessage({
                type: "error",
                text: err.message || "Failed to send invitation"
            });
        } finally {
            setAssigningAdmin(false);
        }
    };

    // Handle Resend Invitation
    const handleResendInvitation = async (zoneId: string) => {
        setActionLoadingId(zoneId);
        try {
            const res = await fetchApi(`/hierarchy/zones/${zoneId}/resend-invitation`, {
                method: "POST"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to resend invitation");

            showToast("success", resJson.message || "Invitation resent.");
            await Promise.all([loadRegionData(), loadDrilldownData(unitIdParam)]);
        } catch (err: any) {
            showToast("error", err.message || "Failed to resend invitation");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Cancel Invitation
    const handleCancelInvitation = async (zoneId: string) => {
        if (!confirm("Are you sure you want to cancel this zone administrator invitation?")) return;
        setActionLoadingId(zoneId);
        try {
            const res = await fetchApi(`/hierarchy/zones/${zoneId}/cancel-invitation`, {
                method: "DELETE"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to cancel invitation");

            showToast("success", "Invitation cancelled.");
            await Promise.all([loadRegionData(), loadDrilldownData(unitIdParam)]);
        } catch (err: any) {
            showToast("error", err.message || "Failed to cancel invitation");
        } finally {
            setActionLoadingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div
                    className={`fixed top-4 right-4 z-50 p-3.5 rounded-lg shadow-md border text-xs font-semibold flex items-center gap-2 ${
                        toastMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                            : "bg-rose-50 text-rose-900 border-rose-200"
                    }`}
                >
                    {toastMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6 border-b border-slate-200 w-full sm:w-auto">
                    <button
                        onClick={() => router.push(`/dashboard/region${targetQueryOnly}`)}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "overview" && !unitIdParam
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <span>Dashboard</span>
                    </button>
                    <button
                        onClick={() => navigateToUnit(null)}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "zones" || unitIdParam
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Zones ({data?.counts?.totalZones ?? 0})</span>
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/region?tab=administration${targetParam}`)}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "administration" && !unitIdParam
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Leadership ({assignedAdministrators.length})</span>
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/region?tab=directives${targetParam}`)}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "directives" && !unitIdParam
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Policies & Directives</span>
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/region?tab=programs${targetParam}`)}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "programs" && !unitIdParam
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Programs & Initiatives</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                        onClick={() => {
                            setNewZoneName("");
                            setNewZoneCode("");
                            setCreateZoneMessage(null);
                            setCreateZoneOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Zone</span>
                    </button>
                    <button
                        onClick={() => {
                            loadRegionData();
                            if (currentTab === "zones" || unitIdParam) {
                                loadDrilldownData(unitIdParam);
                            }
                        }}
                        className="p-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading || drilldownLoading ? "animate-spin text-blue-600" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={loadRegionData}
                        className="px-3 py-1 bg-rose-600 text-white font-semibold rounded hover:bg-rose-700 cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {currentTab === "overview" && !unitIdParam && (
                <div className="space-y-6">
                    {/* Top Row: 2 Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* CARD 1 (Top-Left): Regional Institutional Proportion (Donut Chart) */}
                        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Regional Educational Proportion
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Ratio of registered schools to subordinate administrative offices">
                                    i
                                </span>
                            </div>

                            {/* Donut Chart with real database total in center */}
                            <div className="flex flex-col items-center justify-center py-2 relative">
                                <svg className="w-48 h-48 -rotate-90" viewBox="0 0 120 120">
                                    {/* Background circle track */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="48"
                                        fill="none"
                                        stroke="#f1f5f9"
                                        strokeWidth="14"
                                    />
                                    {/* Schools stroke (deep navy blue #0f172a) */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="48"
                                        fill="none"
                                        stroke="#0f172a"
                                        strokeWidth="14"
                                        strokeDasharray={`${(Number(schoolsPercentage) / 100) * 301.6} 301.6`}
                                        strokeDashoffset="0"
                                        className="transition-all duration-700"
                                    />
                                    {/* Subordinate offices stroke (sky blue #38bdf8) */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="48"
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth="14"
                                        strokeDasharray={`${(Number(subUnitsPercentage) / 100) * 301.6} 301.6`}
                                        strokeDashoffset={`-${(Number(schoolsPercentage) / 100) * 301.6}`}
                                        className="transition-all duration-700"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                                        {fmt(totalEntities)}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Entities
                                    </span>
                                </div>
                            </div>

                            {/* Legend with exact dynamic percentage values */}
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" />
                                        <span className="text-slate-600 font-medium">Registered Schools</span>
                                    </div>
                                    <span className="font-bold text-slate-900">{schoolsPercentage}%</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                                        <span className="text-slate-600 font-medium">Zones & Woredas</span>
                                    </div>
                                    <span className="font-bold text-slate-900">{subUnitsPercentage}%</span>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2 (Top-Right): Registered Zones Overview */}
                        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                        Subordinate Administrative Zones
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Explore registered zones and administrative metrics
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigateToUnit(null)}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                                >
                                    <span>View Directory</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Circular Zonal Cards */}
                            <div className="flex flex-wrap items-center justify-start gap-4 py-2">
                                {realZones.length === 0 ? (
                                    <div className="w-full text-center text-slate-400 text-xs py-8">
                                        No zones registered under this region yet.
                                    </div>
                                ) : (
                                    realZones.map(zone => {
                                        const isSelected = hoveredZone?.id === zone.id;
                                        return (
                                            <div
                                                key={zone.id}
                                                onMouseEnter={() => setHoveredZone(zone)}
                                                onClick={() => navigateToUnit(zone.id)}
                                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full border transition-all duration-200 cursor-pointer ${
                                                    isSelected
                                                        ? "border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-500/20"
                                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                            >
                                                {/* Blue Circle Icon */}
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shrink-0 shadow-xs">
                                                    <Building2 className="w-5 h-5" />
                                                </div>

                                                <div className="flex flex-col pr-2">
                                                    <span className="text-xs font-bold text-slate-900 leading-tight">
                                                        {zone.name}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-slate-500">
                                                        {zone.schoolsCount} {zone.schoolsCount === 1 ? "School" : "Schools"} • {zone.woredasCount} {zone.woredasCount === 1 ? "Woreda" : "Woredas"}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Selected Zone Live Breakdown */}
                            {hoveredZone && (
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Zonal Administration
                                        </span>
                                        <p className="text-sm font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                                            <span>{hoveredZone.name}</span>
                                            {hoveredZone.admin ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    {hoveredZone.admin.name}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                    Admin Vacant
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigateToUnit(hoveredZone.id)}
                                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
                                    >
                                        <span>Explore Zone</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Full-Width Card: Schools & Administrative Units per Zone */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Schools & Administrative Units per Zone
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Comparative zonal telemetry showing schools (left) and woredas (right)">
                                    i
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                                <span className="flex items-center gap-1.5 text-slate-700">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" /> Left: Schools
                                </span>
                                <span className="flex items-center gap-1.5 text-[#0284c7]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> Right: Woredas
                                </span>
                            </div>
                        </div>

                        {/* Chart Grid and Stacked Bars */}
                        <div className="w-full overflow-x-auto pb-8 pt-2">
                            <div className="min-w-[500px] h-72 flex flex-col justify-between relative pl-12 pr-12 pt-4">
                                {/* Horizontal Grid Lines and Dual Y-Axis Labels */}
                                <div className="absolute inset-0 pl-12 pr-12 pointer-events-none flex flex-col justify-between">
                                    {yAxisSteps.map(val => (
                                        <div key={val} className="w-full flex items-center justify-between relative">
                                            {/* Left Y-Axis: Schools */}
                                            <span className="absolute -left-12 text-[11px] font-bold text-slate-500 w-10 text-right">
                                                {val}
                                            </span>
                                            {/* Horizontal Grid Line */}
                                            <div className="w-full border-b border-dashed border-slate-200" />
                                            {/* Right Y-Axis: Woredas */}
                                            <span className="absolute -right-12 text-[11px] font-bold text-[#0284c7] w-10 text-left pl-2">
                                                {val}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Bars Container */}
                                <div className="h-full flex items-end justify-around gap-8 relative z-10 pt-2 pb-14">
                                    {realZones.length === 0 ? (
                                        <div className="w-full text-center text-slate-400 text-xs py-16">
                                            No zonal data available. Register a zone to view analytics.
                                        </div>
                                    ) : (
                                        realZones.map(zone => {
                                            const totalHeightVal = maxSchoolsCount > 0 ? maxSchoolsCount : 1;
                                            const schoolsHeight = Math.min(100, Math.max(12, (zone.schoolsCount / totalHeightVal) * 100));
                                            const subUnitsHeight = Math.min(100, Math.max(12, (zone.woredasCount / totalHeightVal) * 100));

                                            return (
                                                <div
                                                    key={zone.id}
                                                    onClick={() => navigateToUnit(zone.id)}
                                                    className="flex flex-col items-center justify-end h-full group cursor-pointer relative min-w-[70px]"
                                                >
                                                    {/* Floating Tooltip with Full Real Numbers on Hover */}
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 text-center">
                                                        <p className="text-[11px] font-bold text-white">{zone.name}</p>
                                                        <p className="text-[10px] text-sky-300 font-semibold">
                                                            {zone.schoolsCount} Schools • {zone.woredasCount} Woredas
                                                        </p>
                                                    </div>

                                                    {/* Dual / Stacked Bar Column */}
                                                    <div className="flex items-end justify-center gap-1.5 h-full w-14">
                                                        {/* Bar 1: Schools (Deep Navy #0f172a) */}
                                                        <div
                                                            style={{ height: `${schoolsHeight}%` }}
                                                            className="flex-1 bg-[#0f172a] rounded-t-sm transition-all duration-300 group-hover:brightness-125 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Schools: ${zone.schoolsCount}`}
                                                        >
                                                            {zone.schoolsCount}
                                                        </div>
                                                        {/* Bar 2: Woredas (Sky Blue #38bdf8) */}
                                                        <div
                                                            style={{ height: `${subUnitsHeight}%` }}
                                                            className="flex-1 bg-[#38bdf8] rounded-t-sm transition-all duration-300 group-hover:brightness-110 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Woredas: ${zone.woredasCount}`}
                                                        >
                                                            {zone.woredasCount}
                                                        </div>
                                                    </div>

                                                    {/* Slanted / Diagonal Slash Zone Label matching template */}
                                                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 origin-top-left rotate-45 pointer-events-none whitespace-nowrap text-left pt-2">
                                                        <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[120px]">
                                                            {zone.name}
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">
                                                            {zone.woredasCount} {zone.woredasCount === 1 ? "Woreda" : "Woredas"}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Chart Legend */}
                        <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" />
                                <span>Schools (Left Axis)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                                <span>Woredas (Right Axis)</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2 / DRILLDOWN VIEW: REGION HIERARCHY DRILL-DOWN */}
            {(currentTab === "zones" || unitIdParam) && (
                <div className="space-y-4">
                    {/* BREADCRUMB & BACK NAVIGATION HEADER */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
                            {drilldownData?.breadcrumbs && drilldownData.breadcrumbs.length > 1 && (
                                <button
                                    onClick={navigateBack}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer"
                                    title="Back one level"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Back</span>
                                </button>
                            )}

                            {/* Interactive Breadcrumb Chain */}
                            <nav className="flex items-center gap-1 text-xs font-semibold text-slate-600 whitespace-nowrap">
                                {drilldownData?.breadcrumbs ? (
                                    drilldownData.breadcrumbs.map((bc, idx) => {
                                        const isLast = idx === drilldownData.breadcrumbs.length - 1;
                                        return (
                                            <div key={bc.id} className="flex items-center gap-1">
                                                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                                {isLast ? (
                                                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                                        {bc.name}
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            if (bc.type === "REGION") {
                                                                navigateToUnit(null);
                                                            } else {
                                                                navigateToUnit(bc.id);
                                                            }
                                                        }}
                                                        className="hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                                                    >
                                                        {bc.name}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <span className="font-bold text-slate-800">
                                        {data?.regionName || "Regional Education Bureau"}
                                    </span>
                                )}
                            </nav>
                        </div>

                        {/* Actions in header */}
                        <div className="flex items-center gap-2 shrink-0">
                            {(!drilldownData || drilldownData.node.type === "REGION") && (
                                <button
                                    onClick={() => {
                                        setNewZoneName("");
                                        setNewZoneCode("");
                                        setCreateZoneMessage(null);
                                        setCreateZoneOpen(true);
                                    }}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add Zone</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Drilldown Error Banner */}
                    {drilldownError && (
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>{drilldownError}</span>
                            </div>
                            <button
                                onClick={() => loadDrilldownData(unitIdParam)}
                                className="px-3 py-1 bg-rose-600 text-white font-semibold rounded hover:bg-rose-700 cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    )}

                    {/* CURRENT NODE SUMMARY & AGGREGATED METRICS BANNER */}
                    {drilldownData && drilldownData.node.type !== "SCHOOL" && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                            {drilldownData.node.type} LEVEL
                                        </span>
                                        <h2 className="text-lg font-black text-slate-900 tracking-tight">
                                            {drilldownData.node.name}
                                        </h2>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {drilldownData.node.parentName ? `Parent jurisdiction: ${drilldownData.node.parentName}` : "Regional Educational Jurisdiction"}
                                    </p>
                                </div>

                                {drilldownData.admin && (
                                    <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                            {drilldownData.admin.name.charAt(0)}
                                        </div>
                                        <div className="text-xs">
                                            <p className="font-bold text-slate-900 leading-tight">{drilldownData.admin.name}</p>
                                            <p className="text-[11px] text-slate-500">{drilldownData.admin.email}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Metric Cards Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                {drilldownData.counts.zonesCount !== undefined && drilldownData.node.type === "REGION" && (
                                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100/80">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Zones
                                        </span>
                                        <p className="text-xl font-black text-slate-900 mt-0.5">
                                            {fmt(drilldownData.counts.zonesCount)}
                                        </p>
                                    </div>
                                )}
                                {drilldownData.counts.woredasCount !== undefined && (
                                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100/80">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Woredas
                                        </span>
                                        <p className="text-xl font-black text-slate-900 mt-0.5">
                                            {fmt(drilldownData.counts.woredasCount)}
                                        </p>
                                    </div>
                                )}
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100/80">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Schools
                                    </span>
                                    <p className="text-xl font-black text-slate-900 mt-0.5">
                                        {fmt(drilldownData.counts.schoolsCount)}
                                    </p>
                                </div>
                                <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100/80">
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                                        Enrolled Students
                                    </span>
                                    <p className="text-xl font-black text-blue-900 mt-0.5">
                                        {fmt(drilldownData.counts.studentsCount)}
                                    </p>
                                </div>
                                <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100/80">
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                                        Teachers
                                    </span>
                                    <p className="text-xl font-black text-emerald-900 mt-0.5">
                                        {fmt(drilldownData.counts.teachersCount)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SCHOOL LEAF DRILLDOWN VIEW */}
                    {drilldownData && drilldownData.node.type === "SCHOOL" && (
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                            SCHOOL PROFILE
                                        </span>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                            {drilldownData.node.name}
                                        </h2>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Located in Woreda: <span className="font-semibold text-slate-700">{drilldownData.node.parentName || "Unknown Woreda"}</span>
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Active School</span>
                                    </span>
                                </div>
                            </div>

                            {/* School Key Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                                        <GraduationCap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                                            Enrolled Students
                                        </span>
                                        <p className="text-xl font-black text-blue-900">
                                            {fmt(drilldownData.counts.studentsCount)}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                                            Teaching Staff
                                        </span>
                                        <p className="text-xl font-black text-emerald-900">
                                            {fmt(drilldownData.counts.teachersCount)}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                            Established Year
                                        </span>
                                        <p className="text-lg font-bold text-slate-900">
                                            {drilldownData.schoolProfile?.establishedYear || "N/A"}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                            Principal / Admin
                                        </span>
                                        <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">
                                            {drilldownData.admin?.name || "Unassigned"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* School Contact & Address Card */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-blue-600" />
                                        <span>Campus & Contact Details</span>
                                    </h4>
                                    <div className="space-y-2 text-xs text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>Address: <strong className="text-slate-800">{drilldownData.schoolProfile?.address || "Registered Campus"}</strong></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>Phone: <strong className="text-slate-800">{drilldownData.schoolProfile?.phoneNumber || "Official line registered"}</strong></span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>Email: <strong className="text-slate-800">{drilldownData.schoolProfile?.contactEmail || drilldownData.admin?.email || "N/A"}</strong></span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                        <Shield className="w-4 h-4 text-indigo-600" />
                                        <span>Hierarchy Lineage</span>
                                    </h4>
                                    <div className="space-y-1.5 text-xs">
                                        {drilldownData.breadcrumbs.map((bc, idx) => (
                                            <div key={bc.id} className="flex items-center gap-2 text-slate-600">
                                                <span className="w-4 text-center font-bold text-slate-400">{idx + 1}.</span>
                                                <span className="font-semibold text-slate-800">{bc.name}</span>
                                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-sm">{bc.type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CHILD DIRECTORY TABLE FOR CURRENT NODE */}
                    {drilldownData && drilldownData.node.type !== "SCHOOL" && (
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4 p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                        {drilldownData.node.type === "REGION"
                                            ? "Subordinate Zones"
                                            : drilldownData.node.type === "ZONE"
                                            ? "Subordinate Woredas"
                                            : "Subordinate Schools"}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Click any unit to drill down further into the hierarchy
                                    </p>
                                </div>

                                <div className="relative w-full sm:w-72">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search subordinate units..."
                                        value={drilldownSearch}
                                        onChange={e => setDrilldownSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="py-3 px-4">Unit Name</th>
                                            {drilldownData.node.type === "REGION" && <th className="py-3 px-4">Woredas</th>}
                                            <th className="py-3 px-4">Schools</th>
                                            <th className="py-3 px-4">Students</th>
                                            <th className="py-3 px-4">Teachers</th>
                                            <th className="py-3 px-4">Administrator</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                        {drilldownLoading ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                                                        <span>Loading hierarchy tier...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredDrilldownChildren.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-slate-400">
                                                    No subordinate units found under this level.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredDrilldownChildren.map(child => (
                                                <tr
                                                    key={child.id}
                                                    onClick={() => navigateToUnit(child.id)}
                                                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                                                >
                                                    <td className="py-3 px-4 font-bold text-slate-900">
                                                        <div className="flex items-center gap-2">
                                                            {child.type === "ZONE" && <Building2 className="w-4 h-4 text-blue-600 shrink-0" />}
                                                            {child.type === "WOREDA" && <MapPin className="w-4 h-4 text-sky-600 shrink-0" />}
                                                            {child.type === "SCHOOL" && <School className="w-4 h-4 text-emerald-600 shrink-0" />}
                                                            <span>{child.name}</span>
                                                        </div>
                                                    </td>
                                                    {drilldownData.node.type === "REGION" && (
                                                        <td className="py-3 px-4 font-semibold text-slate-800">
                                                            {fmt(child.woredasCount ?? 0)}
                                                        </td>
                                                    )}
                                                    <td className="py-3 px-4 font-semibold text-slate-800">
                                                        {child.type === "SCHOOL" ? "1" : fmt(child.schoolsCount ?? 0)}
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold text-blue-700">
                                                        {fmt(child.studentsCount)}
                                                    </td>
                                                    <td className="py-3 px-4 font-semibold text-emerald-700">
                                                        {fmt(child.teachersCount)}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {child.admin ? (
                                                            <div>
                                                                <p className="font-semibold text-slate-900">{child.admin.name}</p>
                                                                <p className="text-[11px] text-slate-500">{child.admin.email}</p>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                onClick={() => navigateToUnit(child.id)}
                                                                className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-700 rounded text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                                                            >
                                                                <span>Explore</span>
                                                                <ChevronRight className="w-3 h-3" />
                                                            </button>

                                                            {child.type === "ZONE" && !child.admin && (
                                                                <button
                                                                    onClick={() => openAssignAdmin(child)}
                                                                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <UserPlus className="w-3 h-3" />
                                                                    <span>Assign Admin</span>
                                                                </button>
                                                            )}
                                                            {child.type === "ZONE" && child.admin && child.admin.status === "INVITATION_PENDING" && (
                                                                <button
                                                                    onClick={() => handleResendInvitation(child.id)}
                                                                    disabled={actionLoadingId === child.id}
                                                                    className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[11px] font-bold transition-colors cursor-pointer"
                                                                >
                                                                    {actionLoadingId === child.id ? "Resending..." : "Resend Invite"}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: LEADERSHIP & ADMINISTRATION */}
            {currentTab === "administration" && !unitIdParam && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4 p-6">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Zonal Leadership & Administrators</h2>
                        <p className="text-xs text-slate-500">Designated administrators governing regional zones</p>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="py-3 px-4">Administrator</th>
                                    <th className="py-3 px-4">Jurisdiction</th>
                                    <th className="py-3 px-4">Email</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                {assignedAdministrators.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                            No zonal administrators appointed yet.
                                        </td>
                                    </tr>
                                ) : (
                                    assignedAdministrators.map(({ zoneId, zoneName, admin }) => (
                                        <tr key={zoneId} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-900">
                                                {admin.name}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-800">
                                                {zoneName}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600">
                                                {admin.email}
                                            </td>
                                            <td className="py-3 px-4">
                                                {admin.status === "ACTIVE" ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        Pending Invite
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {admin.status === "INVITATION_PENDING" && (
                                                        <button
                                                            onClick={() => handleResendInvitation(zoneId)}
                                                            disabled={actionLoadingId === zoneId}
                                                            className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[11px] font-bold transition-colors cursor-pointer"
                                                        >
                                                            {actionLoadingId === zoneId ? "Resending..." : "Resend Invite"}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleCancelInvitation(zoneId)}
                                                        disabled={actionLoadingId === zoneId}
                                                        className="px-2.5 py-1 text-rose-600 hover:text-rose-800 border border-rose-200 hover:bg-rose-50 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                                                    >
                                                        Revoke
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: DIRECTIVES & ANNOUNCEMENTS */}
            {currentTab === "directives" && !unitIdParam && (
                <div>
                    {isPublishingAnnouncement ? (
                        <RegionalAnnouncementPublishView
                            onBack={() => setIsPublishingAnnouncement(false)}
                            onPublished={() => {
                                setIsPublishingAnnouncement(false);
                                loadDirectives();
                            }}
                            regionName={data?.regionName}
                        />
                    ) : (
                        <div className="space-y-4 font-sans">
                            {/* Top Header Bar */}
                            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                            <Megaphone className="w-5 h-5 text-blue-600" />
                                            <span>Directives & Announcements</span>
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Publish official announcements and directives to subordinate zones, woredas, and schools, and monitor delivery confirmations.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => loadDirectives()}
                                            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                            title="Refresh Announcements"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${directivesLoading ? "animate-spin text-blue-600" : ""}`} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsPublishingAnnouncement(true)}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Publish Announcement</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                                        Issued Announcements
                                    </span>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">
                                        {issuedDirectives.length}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                                        Subordinate Reach
                                    </span>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">
                                        {fmt(issuedDirectives.reduce((acc: number, d: any) => acc + (d.totalRecipients || 0), 0))} units
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                                        Confirmations Logged
                                    </span>
                                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                                        {fmt(issuedDirectives.reduce((acc: number, d: any) => acc + (d.acknowledgedCount || 0), 0))}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                                        Federal Directives
                                    </span>
                                    <p className="text-2xl font-bold text-blue-600 mt-1">
                                        {incomingDirectives.length}
                                    </p>
                                </div>
                            </div>

                            {/* Main List Container */}
                            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                                {/* Sub-Tabs and Search Filter */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setDirectiveSubTab("ISSUED")}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                                directiveSubTab === "ISSUED"
                                                    ? "bg-white text-slate-900 shadow-xs"
                                                    : "text-slate-500 hover:text-slate-800"
                                            }`}
                                        >
                                            Regional Announcements ({issuedDirectives.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDirectiveSubTab("INCOMING")}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                                directiveSubTab === "INCOMING"
                                                    ? "bg-white text-slate-900 shadow-xs"
                                                    : "text-slate-500 hover:text-slate-800"
                                            }`}
                                        >
                                            Incoming Federal Directives ({incomingDirectives.length})
                                        </button>
                                    </div>

                                    <div className="relative w-full sm:w-64">
                                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search title, content, or code..."
                                            value={directiveSearch}
                                            onChange={e => setDirectiveSearch(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* List of Announcements */}
                                {directivesLoading ? (
                                    <div className="py-12 text-center text-slate-400">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                                        <span className="text-xs font-medium">Loading announcements...</span>
                                    </div>
                                ) : filteredDirectives.length === 0 ? (
                                    <div className="py-12 text-center text-slate-500">
                                        <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                        <p className="text-xs font-semibold text-slate-700">No announcements found</p>
                                        <p className="text-2xs text-slate-400 mt-0.5">
                                            {directiveSubTab === "ISSUED"
                                                ? "Publish your first official announcement to lower tiers."
                                                : "No incoming national directives from Federal Bureau."}
                                        </p>
                                        {directiveSubTab === "ISSUED" && (
                                            <button
                                                type="button"
                                                onClick={() => setIsPublishingAnnouncement(true)}
                                                className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Create Announcement</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3.5">
                                        {filteredDirectives.map((item: any) => {
                                            const total = item.totalRecipients || 0;
                                            const read = item.readCount || 0;
                                            const ack = item.acknowledgedCount || 0;
                                            const ackPct = total > 0 ? Math.round((ack / total) * 100) : 0;
                                            const isImage = item.attachmentUrl && (
                                                item.attachmentUrl.includes("image") ||
                                                item.attachmentUrl.includes("images.unsplash.com") ||
                                                /\.(jpg|jpeg|png|gif|webp|svg|avif)($|\?)/i.test(item.attachmentUrl)
                                            );

                                            return (
                                                <div
                                                    key={item.id}
                                                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all space-y-3"
                                                >
                                                    {/* Card Header */}
                                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                                                        <div className="space-y-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="text-sm font-bold text-slate-900">
                                                                    {item.title}
                                                                </h3>
                                                                {item.targetLevels && item.targetLevels.length > 0 && (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                                                        Target: {item.targetLevels.join(", ")}
                                                                    </span>
                                                                )}
                                                                {item.priority === "URGENT" || item.priority === "CRITICAL" ? (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                                        {item.priority}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                                                                <span>Issued: {new Date(item.issueDate || item.createdAt).toLocaleDateString()}</span>
                                                                {item.deadline && (
                                                                    <span className="text-rose-600 font-semibold">
                                                                        Due: {new Date(item.deadline).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                                {item.issuer?.name && !item.isIssuedByMe && (
                                                                    <span className="text-slate-600 font-medium">
                                                                        From: {item.issuer.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Status Pills */}
                                                        {item.isIssuedByMe ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                    <span>{ack} / {total} Confirmed ({ackPct}%)</span>
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => loadDirectiveLedger(item.id)}
                                                                    className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                                                >
                                                                    Delivery Ledger
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                {item.userAcknowledgment?.isAcknowledged ? (
                                                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        <span>Receipt Confirmed</span>
                                                                    </span>
                                                                ) : item.isAcknowledgmentRequired ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setAckModalDirective(item);
                                                                            setAckNotes("");
                                                                            setAckConfirmed(false);
                                                                        }}
                                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                                                                    >
                                                                        <CheckSquare className="w-3.5 h-3.5" />
                                                                        <span>Confirm Receipt</span>
                                                                    </button>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                                                                        Notice
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Details Content */}
                                                    <div className="p-3 bg-slate-50/70 rounded-lg text-xs text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-100">
                                                        {item.content}
                                                    </div>

                                                    {/* Direct Inline Attachment Preview */}
                                                    {item.attachmentUrl && (
                                                        <div className="pt-1">
                                                            {isImage ? (
                                                                <div className="relative inline-block rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-1">
                                                                    <img
                                                                        src={item.attachmentUrl}
                                                                        alt={item.attachmentName || "Attachment"}
                                                                        onClick={() => setPreviewImageUrl(item.attachmentUrl)}
                                                                        className="h-32 w-auto object-cover rounded cursor-pointer hover:opacity-95 transition-opacity"
                                                                    />
                                                                    <div className="mt-1 flex items-center justify-between text-2xs px-1 text-slate-500 font-medium">
                                                                        <span className="truncate max-w-[200px]">{item.attachmentName || "Attached Photo"}</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPreviewImageUrl(item.attachmentUrl)}
                                                                            className="text-blue-600 hover:underline font-bold"
                                                                        >
                                                                            View
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800">
                                                                    <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                                                                    <span className="truncate max-w-[260px]">{item.attachmentName || "Official Document (PDF)"}</span>
                                                                    <a
                                                                        href={item.attachmentUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="ml-2 px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-2xs font-bold transition-colors inline-flex items-center gap-1"
                                                                    >
                                                                        <span>Open PDF</span>
                                                                        <ExternalLink className="w-3 h-3" />
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: PROGRAMS & INITIATIVES */}
            {currentTab === "programs" && !unitIdParam && (
                <ProgramsRegistryView
                    tierName={data?.regionName || "Regional Education Bureau"}
                    tierType="REGION"
                    canCreateProgram={true}
                />
            )}

            {/* MODAL: DELIVERY LEDGER */}
            {selectedDirectiveForLedger && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Announcement Delivery Ledger</span>
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    {selectedDirectiveForLedger.title}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDirectiveForLedger(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Summary metric banner */}
                        {selectedDirectiveForLedger.tracking && (
                            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs">
                                <div>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Target Reach</span>
                                    <p className="text-base font-bold text-slate-900 mt-0.5">
                                        {selectedDirectiveForLedger.tracking.totalRecipients} units
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Seen / Read</span>
                                    <p className="text-base font-bold text-blue-600 mt-0.5">
                                        {selectedDirectiveForLedger.tracking.readCount}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Confirmed Receipts</span>
                                    <p className="text-base font-bold text-emerald-600 mt-0.5">
                                        {selectedDirectiveForLedger.tracking.acknowledgedCount}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Recipients Table */}
                        <div className="overflow-y-auto border border-slate-200 rounded-xl flex-1">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px] sticky top-0">
                                    <tr>
                                        <th className="py-2.5 px-3">Subordinate Unit</th>
                                        <th className="py-2.5 px-3">Level</th>
                                        <th className="py-2.5 px-3">Delivery Status</th>
                                        <th className="py-2.5 px-3">Confirmed By / At</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {!selectedDirectiveForLedger.tracking?.recipients ||
                                    selectedDirectiveForLedger.tracking.recipients.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-400">
                                                No recipient ledger entries recorded.
                                            </td>
                                        </tr>
                                    ) : (
                                        selectedDirectiveForLedger.tracking.recipients.map((rec: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                                    {rec.organizationName}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {rec.organizationType}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    {rec.isAcknowledged ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            <span>Confirmed</span>
                                                        </span>
                                                    ) : rec.isRead ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600">
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span>Seen / Read</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            <span>Pending</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                                    {rec.isAcknowledged ? (
                                                        <div>
                                                            <span className="font-semibold text-slate-800">
                                                                {rec.acknowledgedBy?.name || "Admin"}
                                                            </span>
                                                            <span className="block text-2xs text-slate-400">
                                                                {new Date(rec.acknowledgedAt).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setSelectedDirectiveForLedger(null)}
                                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: INCOMING DIRECTIVE CONFIRM RECEIPT */}
            {ackModalDirective && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                                <span>Confirm Official Receipt</span>
                            </h3>
                            <button
                                onClick={() => setAckModalDirective(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1">
                            <p className="text-xs font-bold text-blue-950">{ackModalDirective.title}</p>
                            <p className="text-2xs text-blue-800">
                                Issued by {ackModalDirective.issuer?.name || "Federal Ministry"} on {new Date(ackModalDirective.issueDate).toLocaleDateString()}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Acknowledgment Notes / Comments (Optional)
                            </label>
                            <textarea
                                rows={3}
                                value={ackNotes}
                                onChange={e => setAckNotes(e.target.value)}
                                placeholder="Add any notes regarding regional receipt or enforcement plan..."
                                className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                            />
                        </div>

                        <div className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                            <input
                                type="checkbox"
                                id="ackRegionalCheck"
                                checked={ackConfirmed}
                                onChange={e => setAckConfirmed(e.target.checked)}
                                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <label htmlFor="ackRegionalCheck" className="text-xs text-slate-700 select-none cursor-pointer">
                                I confirm that our Regional Education Bureau has received, reviewed, and logged this official directive.
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setAckModalDirective(null)}
                                className="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAcknowledgeDirective}
                                disabled={ackSubmitting || !ackConfirmed}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                                {ackSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>{ackSubmitting ? "Submitting..." : "Confirm & Sign"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: IMAGE LIGHTBOX */}
            {previewImageUrl && (
                <div
                    className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4 animate-in fade-in"
                    onClick={() => setPreviewImageUrl(null)}
                >
                    <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
                        <button
                            type="button"
                            onClick={() => setPreviewImageUrl(null)}
                            className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <img
                            src={previewImageUrl}
                            alt="Full preview"
                            className="max-h-[85vh] w-auto object-contain rounded-xl shadow-2xl bg-black"
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

            {/* MODAL: CREATE ZONE */}
            {createZoneOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">Add New Zone</h3>
                            <button
                                onClick={() => setCreateZoneOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {createZoneMessage && (
                            <div
                                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                                    createZoneMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-rose-50 text-rose-800 border border-rose-200"
                                }`}
                            >
                                {createZoneMessage.type === "success" ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                )}
                                <span>{createZoneMessage.text}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateZoneSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Zone Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., North Gondar Zone"
                                    value={newZoneName}
                                    onChange={e => setNewZoneName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Zone Code / Acronym (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., NGZ"
                                    value={newZoneCode}
                                    onChange={e => setNewZoneCode(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateZoneOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingZone || !newZoneName.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {creatingZone ? "Creating..." : "Create Zone"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ASSIGN ZONE ADMINISTRATOR */}
            {assignAdminOpen && selectedZoneForAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Assign Zone Administrator</h3>
                                <p className="text-xs text-slate-500">{selectedZoneForAdmin.name}</p>
                            </div>
                            <button
                                onClick={() => setAssignAdminOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {assignAdminMessage && (
                            <div
                                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                                    assignAdminMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-rose-50 text-rose-800 border border-rose-200"
                                }`}
                            >
                                {assignAdminMessage.type === "success" ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                )}
                                <span>{assignAdminMessage.text}</span>
                            </div>
                        )}

                        <form onSubmit={handleAssignAdminSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Dr. Abebe Bikila"
                                    value={adminFullName}
                                    onChange={e => setAdminFullName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Official Email Address <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g., zone.admin@moe.edu.et"
                                    value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Phone Number (Optional)
                                </label>
                                <input
                                    type="tel"
                                    placeholder="e.g., +251 91 234 5678"
                                    value={adminPhone}
                                    onChange={e => setAdminPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setAssignAdminOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assigningAdmin || !adminFullName.trim() || !adminEmail.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {assigningAdmin ? "Sending Invitation..." : "Send Invitation"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
