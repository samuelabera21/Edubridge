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
    ImageIcon,
    Compass,
    BarChart3
} from "lucide-react";
import DirectivesRecipientView from "./DirectivesRecipientView";
import ZoneAnnouncementPublishView from "./ZoneAnnouncementPublishView";
import ProgramsRegistryView from "./ProgramsRegistryView";
import HierarchicalReportsView from "./HierarchicalReportsView";

export interface WoredaAdmin {
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INVITATION_PENDING";
    invitedAt?: string;
    roleName: string;
}

export interface WoredaItem {
    id: string;
    name: string;
    type: "WOREDA";
    parentId: string | null;
    schoolsCount: number;
    admin: WoredaAdmin | null;
}

export interface ZoneOverviewData {
    zoneId: string | null;
    zoneName: string;
    parentRegionName: string;
    counts: {
        totalWoredas: number;
        totalSchools: number;
    };
    woredas: WoredaItem[];
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

export default function ZoneDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams?.get("tab") || "overview";
    const targetOrgId = searchParams?.get("targetOrgId");
    const unitIdParam = searchParams?.get("unitId") || null;

    const [data, setData] = useState<ZoneOverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Drilldown specific state
    const [drilldownData, setDrilldownData] = useState<DrilldownData | null>(null);
    const [drilldownLoading, setDrilldownLoading] = useState(false);
    const [drilldownError, setDrilldownError] = useState<string | null>(null);
    const [drilldownSearch, setDrilldownSearch] = useState("");

    // Selected / Hovered Woreda on Map
    const [hoveredWoreda, setHoveredWoreda] = useState<WoredaItem | null>(null);

    // Modal State: Create Woreda
    const [createWoredaOpen, setCreateWoredaOpen] = useState(false);
    const [newWoredaName, setNewWoredaName] = useState("");
    const [newWoredaCode, setNewWoredaCode] = useState("");
    const [creatingWoreda, setCreatingWoreda] = useState(false);
    const [createWoredaMessage, setCreateWoredaMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Modal State: Assign Woreda Administrator
    const [assignAdminOpen, setAssignAdminOpen] = useState(false);
    const [selectedWoredaForAdmin, setSelectedWoredaForAdmin] = useState<WoredaItem | null>(null);
    const [adminFullName, setAdminFullName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPhone, setAdminPhone] = useState("");
    const [assigningAdmin, setAssigningAdmin] = useState(false);
    const [assignAdminMessage, setAssignAdminMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Action state for resend/cancel
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Directives & Announcements State
    const [isPublishingAnnouncement, setIsPublishingAnnouncement] = useState(false);
    const [directivesList, setDirectivesList] = useState<any[]>([]);
    const [directivesLoading, setDirectivesLoading] = useState(false);
    const [directivesError, setDirectivesError] = useState<string | null>(null);
    const [directiveSearch, setDirectiveSearch] = useState("");
    const [directiveSubTab, setDirectiveSubTab] = useState<"ISSUED" | "INCOMING">("ISSUED");

    // Ledger & Acknowledgment modals
    const [selectedDirectiveForLedger, setSelectedDirectiveForLedger] = useState<any | null>(null);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [ackModalDirective, setAckModalDirective] = useState<any | null>(null);
    const [ackNotes, setAckNotes] = useState("");
    const [ackConfirmed, setAckConfirmed] = useState(false);
    const [ackSubmitting, setAckSubmitting] = useState(false);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

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

    const loadZoneData = async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = targetOrgId
                ? `/hierarchy/zones/${targetOrgId}/overview`
                : `/hierarchy/zone/overview`;
            const res = await fetchApi(endpoint);
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load Zone Overview");
            }
            const payload = await res.json();
            setData(payload.data);
            if (payload.data?.woredas && payload.data.woredas.length > 0) {
                setHoveredWoreda(payload.data.woredas[0]);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch Zone dashboard data");
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
        loadZoneData();
    }, [targetOrgId]);

    useEffect(() => {
        if (currentTab === "woredas" || unitIdParam) {
            loadDrilldownData(unitIdParam);
        }
    }, [currentTab, unitIdParam, targetOrgId]);

    const showToast = (type: "success" | "error", text: string) => {
        setToastMessage({ type, text });
        setTimeout(() => setToastMessage(null), 3500);
    };

    const targetParam = targetOrgId ? `&targetOrgId=${targetOrgId}` : "";
    const targetQueryOnly = targetOrgId ? `?targetOrgId=${targetOrgId}` : "";

    // Navigation inside zonal dashboard for hierarchy drill-down
    const navigateToUnit = (unitId?: string | null) => {
        setDrilldownSearch("");
        if (unitId) {
            router.push(`/dashboard/zone?tab=woredas&unitId=${unitId}${targetParam}`);
        } else {
            router.push(`/dashboard/zone?tab=woredas${targetParam}`);
        }
    };

    const navigateBack = () => {
        if (!drilldownData || drilldownData.breadcrumbs.length <= 1) {
            navigateToUnit(null);
            return;
        }
        const prevIndex = drilldownData.breadcrumbs.length - 2;
        if (prevIndex >= 0) {
            const targetAncestor = drilldownData.breadcrumbs[prevIndex];
            if (targetAncestor.type === "ZONE") {
                navigateToUnit(null);
            } else {
                navigateToUnit(targetAncestor.id);
            }
        } else {
            navigateToUnit(null);
        }
    };

    // Filter woredas by search query
    const filteredWoredas = useMemo(() => {
        if (!data?.woredas) return [];
        if (!searchQuery.trim()) return data.woredas;
        const q = searchQuery.toLowerCase();
        return data.woredas.filter(
            w =>
                w.name.toLowerCase().includes(q) ||
                (w.admin?.name && w.admin.name.toLowerCase().includes(q)) ||
                (w.admin?.email && w.admin.email.toLowerCase().includes(q))
        );
    }, [data?.woredas, searchQuery]);

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
        if (!data?.woredas) return [];
        return data.woredas
            .filter(w => w.admin !== null)
            .map(w => ({
                woredaId: w.id,
                woredaName: w.name,
                admin: w.admin!
            }));
    }, [data?.woredas]);

    useEffect(() => {
        if (currentTab === "directives") {
            loadDirectives();
        }
    }, [currentTab]);

    const issuedDirectives = useMemo(() => {
        return directivesList.filter((d: any) => d.isIssuedByMe);
    }, [directivesList]);

    const incomingDirectives = useMemo(() => {
        return directivesList.filter((d: any) => !d.isIssuedByMe);
    }, [directivesList]);

    const filteredDirectives = useMemo(() => {
        const base = directiveSubTab === "ISSUED" ? issuedDirectives : incomingDirectives;
        if (!directiveSearch.trim()) return base;
        const q = directiveSearch.toLowerCase();
        return base.filter(
            (d: any) =>
                d.title.toLowerCase().includes(q) ||
                d.content.toLowerCase().includes(q) ||
                (d.code && d.code.toLowerCase().includes(q))
        );
    }, [directiveSubTab, issuedDirectives, incomingDirectives, directiveSearch]);

    // Format number helper
    const fmt = (num: number | undefined | null) => {
        if (num === undefined || num === null) return "0";
        return num.toLocaleString();
    };

    // Proportions
    const totalSchools = data?.counts?.totalSchools ?? 0;
    const totalWoredas = data?.counts?.totalWoredas ?? 0;
    const totalEntities = totalSchools + totalWoredas;
    const schoolsPercentage = totalEntities > 0 ? ((totalSchools / totalEntities) * 100).toFixed(1) : "100.0";
    const subUnitsPercentage = totalEntities > 0 ? ((totalWoredas / totalEntities) * 100).toFixed(1) : "0.0";

    const realWoredas = data?.woredas ?? [];
    const maxSchoolsCount = useMemo(() => {
        if (realWoredas.length === 0) return 5;
        const max = Math.max(...realWoredas.map(w => w.schoolsCount));
        return Math.max(max, 4);
    }, [realWoredas]);

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

    // Handle Create Woreda Submit
    const handleCreateWoredaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const effectiveZoneId = data?.zoneId || targetOrgId;
        if (!newWoredaName.trim() || !effectiveZoneId) return;

        setCreatingWoreda(true);
        setCreateWoredaMessage(null);
        try {
            const res = await fetchApi("/hierarchy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newWoredaName.trim(),
                    type: "WOREDA",
                    parentId: effectiveZoneId,
                    code: newWoredaCode.trim() || undefined
                })
            });

            const resJson = await res.json();
            if (!res.ok) {
                throw new Error(resJson.message || "Failed to create Woreda");
            }

            setCreateWoredaMessage({
                type: "success",
                text: `Woreda "${newWoredaName.trim()}" created successfully.`
            });

            await Promise.all([loadZoneData(), loadDrilldownData(unitIdParam)]);

            setTimeout(() => {
                setCreateWoredaOpen(false);
                setNewWoredaName("");
                setNewWoredaCode("");
                setCreateWoredaMessage(null);
            }, 800);
        } catch (err: any) {
            setCreateWoredaMessage({
                type: "error",
                text: err.message || "Could not create Woreda"
            });
        } finally {
            setCreatingWoreda(false);
        }
    };

    // Open Assign Admin Modal
    const openAssignAdmin = (woreda: { id: string; name: string }) => {
        setSelectedWoredaForAdmin(woreda as WoredaItem);
        setAdminFullName("");
        setAdminEmail("");
        setAdminPhone("");
        setAssignAdminMessage(null);
        setAssignAdminOpen(true);
    };

    // Handle Assign Woreda Admin Submit
    const handleAssignAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWoredaForAdmin || !adminFullName.trim() || !adminEmail.trim()) return;

        setAssigningAdmin(true);
        setAssignAdminMessage(null);
        try {
            const res = await fetchApi(`/hierarchy/woredas/${selectedWoredaForAdmin.id}/assign-admin`, {
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

            await Promise.all([loadZoneData(), loadDrilldownData(unitIdParam)]);

            setTimeout(() => {
                setAssignAdminOpen(false);
                setSelectedWoredaForAdmin(null);
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
    const handleResendInvitation = async (woredaId: string) => {
        setActionLoadingId(woredaId);
        try {
            const res = await fetchApi(`/hierarchy/woredas/${woredaId}/resend-invitation`, {
                method: "POST"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to resend invitation");

            showToast("success", resJson.message || "Invitation resent.");
            await Promise.all([loadZoneData(), loadDrilldownData(unitIdParam)]);
        } catch (err: any) {
            showToast("error", err.message || "Failed to resend invitation");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Cancel Invitation
    const handleCancelInvitation = async (woredaId: string) => {
        if (!confirm("Are you sure you want to cancel this woreda administrator invitation?")) return;
        setActionLoadingId(woredaId);
        try {
            const res = await fetchApi(`/hierarchy/woredas/${woredaId}/cancel-invitation`, {
                method: "DELETE"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to cancel invitation");

            showToast("success", "Invitation cancelled.");
            await Promise.all([loadZoneData(), loadDrilldownData(unitIdParam)]);
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
                        onClick={() => router.push(`/dashboard/zone${targetQueryOnly}`)}
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
                            currentTab === "woredas" || unitIdParam
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Woredas ({data?.counts?.totalWoredas ?? 0})</span>
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/zone?tab=administration${targetParam}`)}
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
                        onClick={() => router.push(`/dashboard/zone?tab=directives${targetParam}`)}
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
                        onClick={() => router.push(`/dashboard/zone?tab=programs${targetParam}`)}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "programs" && !unitIdParam
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Programs & Initiatives</span>
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/zone?tab=reports${targetParam}`)}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "reports" && !unitIdParam
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Reports & Analytics</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                        onClick={() => {
                            setNewWoredaName("");
                            setNewWoredaCode("");
                            setCreateWoredaMessage(null);
                            setCreateWoredaOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Woreda</span>
                    </button>
                    <button
                        onClick={() => {
                            loadZoneData();
                            if (currentTab === "woredas" || unitIdParam) {
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
                        onClick={loadZoneData}
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
                        
                        {/* CARD 1 (Top-Left): Zonal Institutional Proportion (Donut Chart) */}
                        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Zonal Educational Proportion
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Ratio of registered schools to subordinate woreda education offices">
                                    i
                                </span>
                            </div>

                            {/* Donut Chart */}
                            <div className="flex flex-col items-center justify-center py-2 relative">
                                <svg className="w-48 h-48 -rotate-90" viewBox="0 0 120 120">
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="48"
                                        fill="none"
                                        stroke="#f1f5f9"
                                        strokeWidth="14"
                                    />
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

                            {/* Legend */}
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
                                        <span className="text-slate-600 font-medium">Woreda Offices</span>
                                    </div>
                                    <span className="font-bold text-slate-900">{subUnitsPercentage}%</span>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2 (Top-Right): Registered Woredas Overview */}
                        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                        Subordinate Woredas
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Explore registered woredas and administrative metrics
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

                            {/* Circular Woreda Cards */}
                            <div className="flex flex-wrap items-center justify-start gap-4 py-2">
                                {realWoredas.length === 0 ? (
                                    <div className="w-full text-center text-slate-400 text-xs py-8">
                                        No woredas registered under this zone yet.
                                    </div>
                                ) : (
                                    realWoredas.map(woreda => {
                                        const isSelected = hoveredWoreda?.id === woreda.id;
                                        return (
                                            <div
                                                key={woreda.id}
                                                onMouseEnter={() => setHoveredWoreda(woreda)}
                                                onClick={() => navigateToUnit(woreda.id)}
                                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full border transition-all duration-200 cursor-pointer ${
                                                    isSelected
                                                        ? "border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-500/20"
                                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shrink-0 shadow-xs">
                                                    <MapPin className="w-5 h-5" />
                                                </div>

                                                <div className="flex flex-col pr-2">
                                                    <span className="text-xs font-bold text-slate-900 leading-tight">
                                                        {woreda.name}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-slate-500">
                                                        {woreda.schoolsCount} {woreda.schoolsCount === 1 ? "School" : "Schools"}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Selected Woreda Live Breakdown */}
                            {hoveredWoreda && (
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Woreda Administration
                                        </span>
                                        <p className="text-sm font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                                            <span>{hoveredWoreda.name}</span>
                                            {hoveredWoreda.admin ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    {hoveredWoreda.admin.name}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                    Admin Vacant
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigateToUnit(hoveredWoreda.id)}
                                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
                                    >
                                        <span>Explore Woreda</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Full-Width Card: Schools per Woreda */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Schools per Woreda
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Comparative school telemetry across subordinate woredas">
                                    i
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                                <span className="flex items-center gap-1.5 text-slate-700">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" /> Schools Count
                                </span>
                            </div>
                        </div>

                        {/* Chart Grid */}
                        <div className="w-full overflow-x-auto pb-8 pt-2">
                            <div className="min-w-[500px] h-72 flex flex-col justify-between relative pl-12 pr-12 pt-4">
                                <div className="absolute inset-0 pl-12 pr-12 pointer-events-none flex flex-col justify-between">
                                    {yAxisSteps.map(val => (
                                        <div key={val} className="w-full flex items-center justify-between relative">
                                            <span className="absolute -left-12 text-[11px] font-bold text-slate-500 w-10 text-right">
                                                {val}
                                            </span>
                                            <div className="w-full border-b border-dashed border-slate-200" />
                                            <span className="absolute -right-12 text-[11px] font-bold text-slate-400 w-10 text-left pl-2">
                                                {val}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="h-full flex items-end justify-around gap-8 relative z-10 pt-2 pb-14">
                                    {realWoredas.length === 0 ? (
                                        <div className="w-full text-center text-slate-400 text-xs py-16">
                                            No woreda data available. Register a woreda to view analytics.
                                        </div>
                                    ) : (
                                        realWoredas.map(woreda => {
                                            const totalHeightVal = maxSchoolsCount > 0 ? maxSchoolsCount : 1;
                                            const schoolsHeight = Math.min(100, Math.max(12, (woreda.schoolsCount / totalHeightVal) * 100));

                                            return (
                                                <div
                                                    key={woreda.id}
                                                    onClick={() => navigateToUnit(woreda.id)}
                                                    className="flex flex-col items-center justify-end h-full group cursor-pointer relative min-w-[70px]"
                                                >
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 text-center">
                                                        <p className="text-[11px] font-bold text-white">{woreda.name}</p>
                                                        <p className="text-[10px] text-sky-300 font-semibold">
                                                            {woreda.schoolsCount} Schools
                                                        </p>
                                                    </div>

                                                    <div className="flex items-end justify-center h-full w-12">
                                                        <div
                                                            style={{ height: `${schoolsHeight}%` }}
                                                            className="w-full bg-[#0f172a] rounded-t-sm transition-all duration-300 group-hover:brightness-125 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Schools: ${woreda.schoolsCount}`}
                                                        >
                                                            {woreda.schoolsCount}
                                                        </div>
                                                    </div>

                                                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 origin-top-left rotate-45 pointer-events-none whitespace-nowrap text-left pt-2">
                                                        <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[120px]">
                                                            {woreda.name}
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">
                                                            {woreda.schoolsCount} {woreda.schoolsCount === 1 ? "School" : "Schools"}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" />
                                <span>Registered Schools Count</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2 / DRILLDOWN VIEW: ZONE HIERARCHY DRILL-DOWN */}
            {(currentTab === "woredas" || unitIdParam) && (
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
                                                            if (bc.type === "ZONE") {
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
                                        {data?.zoneName || "Zonal Education Department"}
                                    </span>
                                )}
                            </nav>
                        </div>

                        {/* Actions in header */}
                        <div className="flex items-center gap-2 shrink-0">
                            {(!drilldownData || drilldownData.node.type === "ZONE") && (
                                <button
                                    onClick={() => {
                                        setNewWoredaName("");
                                        setNewWoredaCode("");
                                        setCreateWoredaMessage(null);
                                        setCreateWoredaOpen(true);
                                    }}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add Woreda</span>
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
                                        {drilldownData.node.parentName ? `Parent jurisdiction: ${drilldownData.node.parentName}` : "Zonal Educational Jurisdiction"}
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
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {drilldownData.counts.woredasCount !== undefined && drilldownData.node.type === "ZONE" && (
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
                                        {drilldownData.node.type === "ZONE"
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
                                                <td colSpan={6} className="py-8 text-center text-slate-400">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                                                        <span>Loading hierarchy tier...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredDrilldownChildren.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-slate-400">
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
                                                            {child.type === "WOREDA" && <MapPin className="w-4 h-4 text-sky-600 shrink-0" />}
                                                            {child.type === "SCHOOL" && <School className="w-4 h-4 text-emerald-600 shrink-0" />}
                                                            <span>{child.name}</span>
                                                        </div>
                                                    </td>
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
                                                                <ChevronRight className="w-3.5 h-3.5" />
                                                            </button>

                                                            {child.type === "WOREDA" && !child.admin && (
                                                                <button
                                                                    onClick={() => openAssignAdmin(child)}
                                                                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <UserPlus className="w-3.5 h-3.5" />
                                                                    <span>Assign Admin</span>
                                                                </button>
                                                            )}
                                                            {child.type === "WOREDA" && child.admin && child.admin.status === "INVITATION_PENDING" && (
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
                        <h2 className="text-base font-bold text-slate-900">Woreda Leadership & Administrators</h2>
                        <p className="text-xs text-slate-500">Designated administrators governing zonal woredas</p>
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
                                            No woreda administrators appointed yet.
                                        </td>
                                    </tr>
                                ) : (
                                    assignedAdministrators.map(({ woredaId, woredaName, admin }) => (
                                        <tr key={woredaId} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-900">
                                                {admin.name}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-800">
                                                {woredaName}
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
                                                            onClick={() => handleResendInvitation(woredaId)}
                                                            disabled={actionLoadingId === woredaId}
                                                            className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[11px] font-bold transition-colors cursor-pointer"
                                                        >
                                                            {actionLoadingId === woredaId ? "Resending..." : "Resend Invite"}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleCancelInvitation(woredaId)}
                                                        disabled={actionLoadingId === woredaId}
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
                        <ZoneAnnouncementPublishView
                            onBack={() => setIsPublishingAnnouncement(false)}
                            onPublished={() => {
                                setIsPublishingAnnouncement(false);
                                loadDirectives();
                            }}
                            zoneName={data?.zoneName}
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
                                            Publish official announcements and circulars to woredas and schools in your zone, and monitor delivery confirmations.
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
                                        Jurisdiction Reach
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
                                        Higher Directives
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
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                                directiveSubTab === "ISSUED"
                                                    ? "bg-white text-slate-900 shadow-xs"
                                                    : "text-slate-500 hover:text-slate-800"
                                            }`}
                                        >
                                            Zone Announcements ({issuedDirectives.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDirectiveSubTab("INCOMING")}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                                                directiveSubTab === "INCOMING"
                                                    ? "bg-white text-slate-900 shadow-xs"
                                                    : "text-slate-500 hover:text-slate-800"
                                            }`}
                                        >
                                            Incoming Directives ({incomingDirectives.length})
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
                                                ? "Publish your first official circular or directive to woredas and schools."
                                                : "No incoming directives from higher governance tiers."}
                                        </p>
                                        {directiveSubTab === "ISSUED" && (
                                            <button
                                                type="button"
                                                onClick={() => setIsPublishingAnnouncement(true)}
                                                className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
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
                                                                    <span className="text-2xs text-slate-400">
                                                                        {item.userAcknowledgment?.isRead ? "Viewed" : "Unread"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Content Body */}
                                                    <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                                                        {item.content}
                                                    </p>

                                                    {/* Direct Inline Attachment Preview (MinIO) */}
                                                    {item.attachmentUrl && (
                                                        <div className="pt-2">
                                                            {isImage ? (
                                                                <div className="space-y-1.5">
                                                                    <div
                                                                        className="relative group max-w-sm rounded-lg overflow-hidden border border-slate-200 bg-slate-50 cursor-pointer"
                                                                        onClick={() => setPreviewImageUrl(item.attachmentUrl)}
                                                                    >
                                                                        <img
                                                                            src={item.attachmentUrl}
                                                                            alt={item.attachmentName || "Attachment Preview"}
                                                                            className="w-full max-h-48 object-cover group-hover:scale-105 transition-transform"
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-bold">
                                                                            <Eye className="w-4 h-4" />
                                                                            <span>Click to Enlarge</span>
                                                                        </div>
                                                                    </div>
                                                                    {item.attachmentName && (
                                                                        <span className="text-2xs text-slate-400 font-medium block">
                                                                            📷 {item.attachmentName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 max-w-md">
                                                                    <Paperclip className="w-4 h-4 text-blue-600 shrink-0" />
                                                                    <span className="truncate flex-1 font-medium text-slate-800">
                                                                        {item.attachmentName || "Attached Document (PDF)"}
                                                                    </span>
                                                                    <a
                                                                        href={item.attachmentUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-blue-600 hover:text-blue-800 font-bold text-xs inline-flex items-center gap-0.5"
                                                                    >
                                                                        <span>Open</span>
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
                    tierName={data?.zoneName || "Zonal Education Department"}
                    tierType="ZONE"
                    canCreateProgram={true}
                />
            )}

            {/* TAB: HIERARCHICAL REPORTS & EXPORT */}
            {currentTab === "reports" && !unitIdParam && (
                <HierarchicalReportsView
                    tierName={data?.zoneName || "Zonal Education Department"}
                    tierType="ZONE"
                />
            )}

            {/* MODAL: DELIVERY CONFIRMATION LEDGER */}
            {selectedDirectiveForLedger && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
                    <div className="w-full max-w-3xl rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Delivery Ledger: {selectedDirectiveForLedger.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Detailed delivery and sign-off records for woredas and schools in your zone.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedDirectiveForLedger(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Rollup Counters */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-500">Recipients</span>
                                <p className="text-lg font-bold text-slate-900">{selectedDirectiveForLedger.tracking?.totalRecipients || 0}</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-center">
                                <span className="text-[10px] uppercase font-bold text-blue-600">Viewed</span>
                                <p className="text-lg font-bold text-blue-900">{selectedDirectiveForLedger.tracking?.readCount || 0}</p>
                            </div>
                            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 text-center">
                                <span className="text-[10px] uppercase font-bold text-emerald-600">Confirmed</span>
                                <p className="text-lg font-bold text-emerald-900">{selectedDirectiveForLedger.tracking?.acknowledgedCount || 0}</p>
                            </div>
                        </div>

                        {/* Recipients Table */}
                        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600">
                                        <th className="py-2.5 px-3">Recipient Unit</th>
                                        <th className="py-2.5 px-3">Status</th>
                                        <th className="py-2.5 px-3">Read Time</th>
                                        <th className="py-2.5 px-3">Confirmed By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {selectedDirectiveForLedger.tracking?.recipients?.map((r: any) => (
                                        <tr key={r.organizationId} className="hover:bg-slate-50/60">
                                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                                                {r.organizationName}
                                            </td>
                                            <td className="py-2.5 px-3">
                                                {r.isAcknowledged ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        Confirmed
                                                    </span>
                                                ) : r.isRead ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                        Viewed
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">
                                                        Delivered
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                                {r.readAt ? new Date(r.readAt).toLocaleString() : "—"}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                                {r.acknowledgedBy?.name || (r.isAcknowledged ? "Signed" : "—")}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setSelectedDirectiveForLedger(null)}
                                className="px-4 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                            >
                                Close Ledger
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CONFIRM RECEIPT / ACKNOWLEDGE */}
            {ackModalDirective && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
                    <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl space-y-4">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    Official Receipt Confirmation
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {ackModalDirective.title}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAckModalDirective(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs text-slate-700">
                            <p>
                                By confirming, your administrative receipt will be logged on the governance dispatch registry.
                            </p>

                            <div>
                                <label className="block text-2xs uppercase font-bold text-slate-500 mb-1">
                                    Acknowledgment Notes (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    value={ackNotes}
                                    onChange={e => setAckNotes(e.target.value)}
                                    placeholder="Add optional notes or compliance dispatch notes..."
                                    className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <label className="flex items-center gap-2 p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={ackConfirmed}
                                    onChange={e => setAckConfirmed(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="font-semibold text-slate-800 text-xs">
                                    I formally confirm receipt of this official directive.
                                </span>
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setAckModalDirective(null)}
                                className="px-4 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleAcknowledgeDirective}
                                disabled={ackSubmitting || !ackConfirmed}
                                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-xs cursor-pointer"
                            >
                                {ackSubmitting ? "Recording..." : "Confirm & Sign"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LIGHTBOX: IMAGE FULL VIEW */}
            {previewImageUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in fade-in"
                    onClick={() => setPreviewImageUrl(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-black">
                        <button
                            type="button"
                            onClick={() => setPreviewImageUrl(null)}
                            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img
                            src={previewImageUrl}
                            alt="Attachment preview full"
                            className="max-h-[85vh] max-w-full object-contain mx-auto"
                        />
                    </div>
                </div>
            )}

            {/* MODAL: CREATE WOREDA */}
            {createWoredaOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">Add New Woreda</h3>
                            <button
                                onClick={() => setCreateWoredaOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {createWoredaMessage && (
                            <div
                                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                                    createWoredaMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-rose-50 text-rose-800 border border-rose-200"
                                }`}
                            >
                                {createWoredaMessage.type === "success" ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                )}
                                <span>{createWoredaMessage.text}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateWoredaSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Woreda Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Debre Tabor Woreda"
                                    value={newWoredaName}
                                    onChange={e => setNewWoredaName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Woreda Code / Acronym (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., DTW"
                                    value={newWoredaCode}
                                    onChange={e => setNewWoredaCode(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateWoredaOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingWoreda || !newWoredaName.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {creatingWoreda ? "Creating..." : "Create Woreda"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ASSIGN WOREDA ADMINISTRATOR */}
            {assignAdminOpen && selectedWoredaForAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Assign Woreda Administrator</h3>
                                <p className="text-xs text-slate-500">{selectedWoredaForAdmin.name}</p>
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
                                    placeholder="e.g., Ato Girma Tesfaye"
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
                                    placeholder="e.g., woreda.admin@moe.edu.et"
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
