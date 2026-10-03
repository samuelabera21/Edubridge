"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    Layers,
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
    Send,
    Eye,
    Clock,
    Check,
    Paperclip,
    Filter,
    Bell
} from "lucide-react";
import DirectivesPublishView from "./DirectivesPublishView";

export interface RegionAdmin {
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INVITATION_PENDING";
    invitedAt?: string;
    roleName: string;
}

export interface ZoneBreakdown {
    id: string;
    name: string;
    woredasCount: number;
    schoolsCount: number;
    adminName: string | null;
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
    zones?: ZoneBreakdown[];
}

export interface FederalOverviewData {
    federalId: string | null;
    federalName: string;
    counts: {
        totalRegions: number;
        totalZones: number;
        totalWoredas: number;
        totalSchools: number;
        totalStudents: number;
        totalTeachers: number;
    };
    regions: RegionItem[];
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

export interface DirectiveRecipientTracking {
    organizationId: string;
    organizationName: string;
    organizationType: string;
    isRead: boolean;
    readAt: string | null;
    isAcknowledged: boolean;
    acknowledgedAt: string | null;
    acknowledgedBy: { name: string; email: string } | null;
    notes: string | null;
}

export interface DirectiveItem {
    id: string;
    title: string;
    code: string | null;
    type: "POLICY" | "DIRECTIVE";
    category: string | null;
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    content: string;
    issueDate: string;
    effectiveDate: string;
    deadline: string | null;
    attachmentUrl: string | null;
    attachmentName: string | null;
    isAcknowledgmentRequired: boolean;
    targetLevelAll: boolean;
    targetLevels: string[];
    cascadeDescendants: boolean;
    issuerOrganization?: { id: string; name: string; type: string };
    author?: { id: string; name: string; email: string };
    targetOrganizationUnits?: Array<{ organization: { id: string; name: string; type: string } }>;
    totalRecipients?: number;
    readCount?: number;
    acknowledgedCount?: number;
    tracking?: {
        totalRecipients: number;
        readCount: number;
        acknowledgedCount: number;
        recipients: DirectiveRecipientTracking[];
    };
}

export default function FederalDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams?.get("tab") || "overview";
    const unitIdParam = searchParams?.get("unitId") || null;

    const [data, setData] = useState<FederalOverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Drilldown specific state
    const [drilldownData, setDrilldownData] = useState<DrilldownData | null>(null);
    const [drilldownLoading, setDrilldownLoading] = useState(false);
    const [drilldownError, setDrilldownError] = useState<string | null>(null);
    const [drilldownSearch, setDrilldownSearch] = useState("");

    // Selected / Hovered Region on Map
    const [hoveredRegion, setHoveredRegion] = useState<RegionItem | null>(null);

    // Modal State: Create Region
    const [createRegionOpen, setCreateRegionOpen] = useState(false);
    const [newRegionName, setNewRegionName] = useState("");
    const [newRegionCode, setNewRegionCode] = useState("");
    const [creatingRegion, setCreatingRegion] = useState(false);
    const [createRegionMessage, setCreateRegionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Modal State: Assign Regional Administrator
    const [assignAdminOpen, setAssignAdminOpen] = useState(false);
    const [selectedRegionForAdmin, setSelectedRegionForAdmin] = useState<RegionItem | null>(null);
    const [adminFullName, setAdminFullName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPhone, setAdminPhone] = useState("");
    const [assigningAdmin, setAssigningAdmin] = useState(false);
    const [assignAdminMessage, setAssignAdminMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Directives State
    const [directivesList, setDirectivesList] = useState<DirectiveItem[]>([]);
    const [directivesLoading, setDirectivesLoading] = useState(false);
    const [directivesError, setDirectivesError] = useState<string | null>(null);
    const [directiveSearch, setDirectiveSearch] = useState("");
    const [directiveTypeFilter, setDirectiveTypeFilter] = useState<string>("ALL");
    const [selectedDirectiveForDetail, setSelectedDirectiveForDetail] = useState<DirectiveItem | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [isPublishingDirective, setIsPublishingDirective] = useState(false);

    // Action state for resend/cancel
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const loadFederalData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchApi("/hierarchy/federal/overview");
            if (!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.message || "Failed to load Federal Overview");
            }
            const payload = await res.json();
            setData(payload.data);
            if (payload.data?.regions && payload.data.regions.length > 0) {
                setHoveredRegion(payload.data.regions[0]);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch Federal dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const loadDrilldownData = async (targetId?: string | null) => {
        setDrilldownLoading(true);
        setDrilldownError(null);
        try {
            const endpoint = targetId ? `/hierarchy/drilldown/${targetId}` : `/hierarchy/drilldown`;
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

    const loadDirectives = async () => {
        setDirectivesLoading(true);
        setDirectivesError(null);
        try {
            const res = await fetchApi("/directives");
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load National Policies & Directives");
            }
            const payload = await res.json();
            setDirectivesList(payload.data || []);
        } catch (err: any) {
            setDirectivesError(err.message || "Failed to fetch directives");
        } finally {
            setDirectivesLoading(false);
        }
    };

    const loadDirectiveDetail = async (id: string) => {
        setDetailLoading(true);
        try {
            const res = await fetchApi(`/directives/${id}`);
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load directive details");
            }
            const payload = await res.json();
            setSelectedDirectiveForDetail(payload.data);
        } catch (err: any) {
            showToast("error", err.message || "Failed to load directive tracking");
        } finally {
            setDetailLoading(false);
        }
    };

    useEffect(() => {
        loadFederalData();
        loadDirectives();
    }, []);

    useEffect(() => {
        if (currentTab === "regions" || unitIdParam) {
            loadDrilldownData(unitIdParam);
        }
        if (currentTab === "directives") {
            loadDirectives();
        }
    }, [currentTab, unitIdParam]);

    const showToast = (type: "success" | "error", text: string) => {
        setToastMessage({ type, text });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Navigation inside federal dashboard for hierarchy drill-down
    const navigateToUnit = (unitId?: string | null) => {
        setDrilldownSearch("");
        if (unitId) {
            router.push(`/dashboard/federal?tab=regions&unitId=${unitId}`);
        } else {
            router.push(`/dashboard/federal?tab=regions`);
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
            if (targetAncestor.type === "FEDERAL") {
                navigateToUnit(null);
            } else {
                navigateToUnit(targetAncestor.id);
            }
        } else {
            navigateToUnit(null);
        }
    };

    // Filter regions by search query
    const filteredRegions = useMemo(() => {
        if (!data?.regions) return [];
        if (!searchQuery.trim()) return data.regions;
        const q = searchQuery.toLowerCase();
        return data.regions.filter(
            r =>
                r.name.toLowerCase().includes(q) ||
                (r.admin?.name && r.admin.name.toLowerCase().includes(q)) ||
                (r.admin?.email && r.admin.email.toLowerCase().includes(q))
        );
    }, [data?.regions, searchQuery]);

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

    // Filter directives list
    const filteredDirectives = useMemo(() => {
        return directivesList.filter(d => {
            const matchesType = directiveTypeFilter === "ALL" || d.type === directiveTypeFilter;
            const matchesSearch =
                !directiveSearch.trim() ||
                d.title.toLowerCase().includes(directiveSearch.toLowerCase()) ||
                d.content.toLowerCase().includes(directiveSearch.toLowerCase()) ||
                (d.code && d.code.toLowerCase().includes(directiveSearch.toLowerCase()));
            return matchesType && matchesSearch;
        });
    }, [directivesList, directiveTypeFilter, directiveSearch]);

    // Extract all administrators for Administration tab
    const assignedAdministrators = useMemo(() => {
        if (!data?.regions) return [];
        return data.regions
            .filter(r => r.admin !== null)
            .map(r => ({
                regionId: r.id,
                regionName: r.name,
                admin: r.admin!
            }));
    }, [data?.regions]);

    // Format number helper
    const fmt = (num: number | undefined | null) => {
        if (num === undefined || num === null) return "0";
        return num.toLocaleString();
    };

    // Calculate real proportions for Card 1
    const totalSchools = data?.counts?.totalSchools ?? 0;
    const totalWoredas = data?.counts?.totalWoredas ?? 0;
    const totalZones = data?.counts?.totalZones ?? 0;
    const totalRegions = data?.counts?.totalRegions ?? 0;
    const totalAdminUnits = totalRegions + totalZones + totalWoredas;
    const totalEntities = totalSchools + totalAdminUnits;
    const schoolsPercentage = totalEntities > 0 ? ((totalSchools / totalEntities) * 100).toFixed(1) : "100.0";
    const adminPercentage = totalEntities > 0 ? ((totalAdminUnits / totalEntities) * 100).toFixed(1) : "0.0";

    const realRegions = data?.regions ?? [];
    const maxSchoolsCount = useMemo(() => {
        if (realRegions.length === 0) return 5;
        const max = Math.max(...realRegions.map(r => r.schoolsCount));
        return Math.max(max, 4);
    }, [realRegions]);

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

    // Handle Create Region Submit
    const handleCreateRegionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRegionName.trim()) return;

        setCreatingRegion(true);
        setCreateRegionMessage(null);
        try {
            const res = await fetchApi("/hierarchy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newRegionName.trim(),
                    type: "REGION",
                    parentId: data?.federalId || undefined
                })
            });

            const resJson = await res.json();
            if (!res.ok) {
                throw new Error(resJson.message || "Failed to create region");
            }

            setCreateRegionMessage({
                type: "success",
                text: `Region "${newRegionName.trim()}" created successfully.`
            });

            await loadFederalData();
            if (currentTab === "regions") {
                await loadDrilldownData(unitIdParam);
            }

            setTimeout(() => {
                setCreateRegionOpen(false);
                setNewRegionName("");
                setNewRegionCode("");
                setCreateRegionMessage(null);
            }, 800);
        } catch (err: any) {
            setCreateRegionMessage({
                type: "error",
                text: err.message || "Could not create region"
            });
        } finally {
            setCreatingRegion(false);
        }
    };

    // Open Assign Admin Modal
    const openAssignAdmin = (region: { id: string; name: string }) => {
        setSelectedRegionForAdmin(region as RegionItem);
        setAdminFullName("");
        setAdminEmail("");
        setAdminPhone("");
        setAssignAdminMessage(null);
        setAssignAdminOpen(true);
    };

    // Handle Assign Regional Admin Submit
    const handleAssignAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRegionForAdmin || !adminFullName.trim() || !adminEmail.trim()) return;

        setAssigningAdmin(true);
        setAssignAdminMessage(null);
        try {
            const res = await fetchApi(`/hierarchy/regions/${selectedRegionForAdmin.id}/assign-admin`, {
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

            await loadFederalData();
            if (currentTab === "regions") {
                await loadDrilldownData(unitIdParam);
            }

            setTimeout(() => {
                setAssignAdminOpen(false);
                setSelectedRegionForAdmin(null);
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
    const handleResendInvitation = async (regionId: string) => {
        setActionLoadingId(regionId);
        try {
            const res = await fetchApi(`/hierarchy/regions/${regionId}/resend-invitation`, {
                method: "POST"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to resend invitation");

            showToast("success", resJson.message || "Invitation resent.");
            await loadFederalData();
            if (currentTab === "regions") {
                await loadDrilldownData(unitIdParam);
            }
        } catch (err: any) {
            showToast("error", err.message || "Failed to resend invitation");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Cancel Invitation
    const handleCancelInvitation = async (regionId: string) => {
        if (!confirm("Are you sure you want to cancel this regional administrator invitation?")) return;
        setActionLoadingId(regionId);
        try {
            const res = await fetchApi(`/hierarchy/regions/${regionId}/cancel-invitation`, {
                method: "DELETE"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to cancel invitation");

            showToast("success", "Invitation cancelled.");
            await loadFederalData();
            if (currentTab === "regions") {
                await loadDrilldownData(unitIdParam);
            }
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
                        onClick={() => router.push("/dashboard/federal")}
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
                            currentTab === "regions" || unitIdParam
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Regions & Hierarchy ({data?.counts?.totalRegions ?? 0})</span>
                    </button>
                    <button
                        onClick={() => router.push("/dashboard/federal?tab=directives")}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "directives" && !unitIdParam
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Policies & Directives ({directivesList.length})</span>
                    </button>
                    <button
                        onClick={() => router.push("/dashboard/federal?tab=administration")}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "administration" && !unitIdParam
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Leadership ({assignedAdministrators.length})</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {currentTab === "directives" ? (
                        <button
                            onClick={() => setIsPublishingDirective(true)}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                            <Send className="w-3.5 h-3.5" />
                            <span>Publish Directive</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setNewRegionName("");
                                setNewRegionCode("");
                                setCreateRegionMessage(null);
                                setCreateRegionOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Region</span>
                        </button>
                    )}
                    <button
                        onClick={() => {
                            loadFederalData();
                            if (currentTab === "regions" || unitIdParam) {
                                loadDrilldownData(unitIdParam);
                            }
                            if (currentTab === "directives") {
                                loadDirectives();
                            }
                        }}
                        className="p-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading || drilldownLoading || directivesLoading ? "animate-spin text-blue-600" : ""}`} />
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
                        onClick={loadFederalData}
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
                        
                        {/* CARD 1 (Top-Left): National Institutional Proportion (Donut Chart) */}
                        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    National Educational Proportion
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Ratio of registered schools to administrative governance offices across Ethiopia">
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
                                    {/* Administrative offices stroke (sky blue #38bdf8) */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="48"
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth="14"
                                        strokeDasharray={`${(Number(adminPercentage) / 100) * 301.6} 301.6`}
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
                                        <span className="text-slate-600 font-medium">Administrative Offices</span>
                                    </div>
                                    <span className="font-bold text-slate-900">{adminPercentage}%</span>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2 (Top-Right): Registered Regional States */}
                        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                        Registered Regional States
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Explore live registered regions and administrative distribution
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigateToUnit(null)}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                                >
                                    <span>Explore Hierarchy</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Circular Regional Cards */}
                            <div className="flex flex-wrap items-center justify-start gap-4 py-2">
                                {realRegions.length === 0 ? (
                                    <div className="w-full text-center text-slate-400 text-xs py-8">
                                        No regions registered yet. Click &quot;Add Region&quot; to begin.
                                    </div>
                                ) : (
                                    realRegions.map(region => {
                                        const isSelected = hoveredRegion?.id === region.id;
                                        return (
                                            <div
                                                key={region.id}
                                                onMouseEnter={() => setHoveredRegion(region)}
                                                onClick={() => navigateToUnit(region.id)}
                                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full border transition-all duration-200 cursor-pointer ${
                                                    isSelected
                                                        ? "border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-500/20"
                                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shrink-0 shadow-xs">
                                                    <Building2 className="w-5 h-5" />
                                                </div>

                                                <div className="flex flex-col pr-2">
                                                    <span className="text-xs font-bold text-slate-900 leading-tight">
                                                        {region.name}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-slate-500">
                                                        {region.schoolsCount} {region.schoolsCount === 1 ? "School" : "Schools"} • {region.zonesCount} {region.zonesCount === 1 ? "Zone" : "Zones"}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Selected Region Live Breakdown */}
                            {hoveredRegion && (
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Regional Administration
                                        </span>
                                        <p className="text-sm font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                                            <span>{hoveredRegion.name}</span>
                                            {hoveredRegion.admin ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    {hoveredRegion.admin.name}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                    Admin Vacant
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigateToUnit(hoveredRegion.id)}
                                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
                                    >
                                        <span>Drill Down into Region</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Full-Width Card: Schools & Administrative Units per Region */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Schools & Administrative Offices per Region
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Comparative regional telemetry showing schools (left) and administrative offices (right)">
                                    i
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                                <span className="flex items-center gap-1.5 text-slate-700">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" /> Left: Schools
                                </span>
                                <span className="flex items-center gap-1.5 text-[#0284c7]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> Right: Zones
                                </span>
                            </div>
                        </div>

                        {/* Chart Grid and Stacked Bars */}
                        <div className="w-full overflow-x-auto pb-8 pt-2">
                            <div className="min-w-[500px] h-72 flex flex-col justify-between relative pl-12 pr-12 pt-4">
                                <div className="absolute inset-0 pl-12 pr-12 pointer-events-none flex flex-col justify-between">
                                    {yAxisSteps.map(val => (
                                        <div key={val} className="w-full flex items-center justify-between relative">
                                            <span className="absolute -left-12 text-[11px] font-bold text-slate-500 w-10 text-right">
                                                {val}
                                            </span>
                                            <div className="w-full border-b border-dashed border-slate-200" />
                                            <span className="absolute -right-12 text-[11px] font-bold text-[#0284c7] w-10 text-left pl-2">
                                                {val}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="h-full flex items-end justify-around gap-8 relative z-10 pt-2 pb-14">
                                    {realRegions.length === 0 ? (
                                        <div className="w-full text-center text-slate-400 text-xs py-16">
                                            No regional data available. Register a region to view analytics.
                                        </div>
                                    ) : (
                                        realRegions.map(region => {
                                            const totalHeightVal = maxSchoolsCount > 0 ? maxSchoolsCount : 1;
                                            const schoolsHeight = Math.min(100, Math.max(12, (region.schoolsCount / totalHeightVal) * 100));
                                            const subUnitsHeight = Math.min(100, Math.max(12, (region.zonesCount / totalHeightVal) * 100));

                                            return (
                                                <div
                                                    key={region.id}
                                                    onClick={() => navigateToUnit(region.id)}
                                                    className="flex flex-col items-center justify-end h-full group cursor-pointer relative min-w-[70px]"
                                                >
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 text-center">
                                                        <p className="text-[11px] font-bold text-white">{region.name}</p>
                                                        <p className="text-[10px] text-sky-300 font-semibold">
                                                            {region.schoolsCount} Schools • {region.zonesCount} Zones
                                                        </p>
                                                    </div>

                                                    <div className="flex items-end justify-center gap-1.5 h-full w-14">
                                                        <div
                                                            style={{ height: `${schoolsHeight}%` }}
                                                            className="flex-1 bg-[#0f172a] rounded-t-sm transition-all duration-300 group-hover:brightness-125 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Schools: ${region.schoolsCount}`}
                                                        >
                                                            {region.schoolsCount}
                                                        </div>
                                                        <div
                                                            style={{ height: `${subUnitsHeight}%` }}
                                                            className="flex-1 bg-[#38bdf8] rounded-t-sm transition-all duration-300 group-hover:brightness-110 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Zones: ${region.zonesCount}`}
                                                        >
                                                            {region.zonesCount}
                                                        </div>
                                                    </div>

                                                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 origin-top-left rotate-45 pointer-events-none whitespace-nowrap text-left pt-2">
                                                        <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[120px]">
                                                            {region.name}
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">
                                                            {region.zonesCount} {region.zonesCount === 1 ? "Zone" : "Zones"}
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
                                <span>Schools (Left Axis)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                                <span>Zones (Right Axis)</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: IN-PAGE HIERARCHY DRILL-DOWN */}
            {(currentTab === "regions" || unitIdParam) && (
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
                                                            if (bc.type === "FEDERAL") {
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
                                        Federal Ministry of Education
                                    </span>
                                )}
                            </nav>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {(!drilldownData || drilldownData.node.type === "FEDERAL") && (
                                <button
                                    onClick={() => {
                                        setNewRegionName("");
                                        setNewRegionCode("");
                                        setCreateRegionMessage(null);
                                        setCreateRegionOpen(true);
                                    }}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add Region</span>
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
                                        {drilldownData.node.parentName ? `Parent jurisdiction: ${drilldownData.node.parentName}` : "National Sovereign Jurisdiction"}
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                {drilldownData.counts.totalRegions !== undefined && (
                                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100/80">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                            Regions
                                        </span>
                                        <p className="text-xl font-black text-slate-900 mt-0.5">
                                            {fmt(drilldownData.counts.totalRegions)}
                                        </p>
                                    </div>
                                )}
                                {drilldownData.counts.zonesCount !== undefined && (
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
                                        Students
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
                                        {drilldownData.node.type === "FEDERAL"
                                            ? "Regional Jurisdictions"
                                            : drilldownData.node.type === "REGION"
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
                                            {drilldownData.node.type === "FEDERAL" && <th className="py-3 px-4">Zones</th>}
                                            {(drilldownData.node.type === "FEDERAL" || drilldownData.node.type === "REGION") && (
                                                <th className="py-3 px-4">Woredas</th>
                                            )}
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
                                                <td colSpan={8} className="py-8 text-center text-slate-400">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                                                        <span>Loading hierarchy tier...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredDrilldownChildren.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="py-8 text-center text-slate-400">
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
                                                            {child.type === "REGION" && <Building2 className="w-4 h-4 text-blue-600 shrink-0" />}
                                                            {child.type === "ZONE" && <Layers className="w-4 h-4 text-sky-600 shrink-0" />}
                                                            {child.type === "WOREDA" && <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />}
                                                            {child.type === "SCHOOL" && <School className="w-4 h-4 text-emerald-600 shrink-0" />}
                                                            <span>{child.name}</span>
                                                        </div>
                                                    </td>
                                                    {drilldownData.node.type === "FEDERAL" && (
                                                        <td className="py-3 px-4 font-semibold text-slate-800">
                                                            {fmt(child.zonesCount ?? 0)}
                                                        </td>
                                                    )}
                                                    {(drilldownData.node.type === "FEDERAL" || drilldownData.node.type === "REGION") && (
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
                                                                <ChevronRight className="w-3.5 h-3.5" />
                                                            </button>

                                                            {child.type === "REGION" && !child.admin && (
                                                                <button
                                                                    onClick={() => openAssignAdmin(child)}
                                                                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <UserPlus className="w-3.5 h-3.5" />
                                                                    <span>Assign Admin</span>
                                                                </button>
                                                            )}
                                                            {child.type === "REGION" && child.admin && child.admin.status === "INVITATION_PENDING" && (
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

            {/* TAB 3: NATIONAL POLICIES & DIRECTIVES */}
            {currentTab === "directives" && !unitIdParam && (
                isPublishingDirective ? (
                    <DirectivesPublishView
                        onBack={() => setIsPublishingDirective(false)}
                        onPublished={() => {
                            setIsPublishingDirective(false);
                            loadDirectives();
                        }}
                    />
                ) : (
                <div className="space-y-6">
                    {/* Summary Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                                Total Issued
                            </span>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                                {directivesList.length}
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                                Policies
                            </span>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                                {directivesList.filter(d => d.type === "POLICY").length}
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                                Pending Sign-off
                            </span>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                                {directivesList.filter(d => d.isAcknowledgmentRequired).length}
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block">
                                Delivery Reach
                            </span>
                            <p className="text-2xl font-bold text-slate-900 mt-1">
                                {fmt(directivesList.reduce((acc, d) => acc + (d.totalRecipients || 0), 0))} units
                            </p>
                        </div>
                    </div>

                    {/* Directives Table Card */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <h3 className="text-sm font-bold text-slate-900">
                                    Official Policies & Directives Registry
                                </h3>
                                <span className="text-[11px] text-slate-400 font-medium">
                                    ({filteredDirectives.length} records)
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* Type Filter */}
                                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                                    <button
                                        onClick={() => setDirectiveTypeFilter("ALL")}
                                        className={`px-3 py-1 rounded-md transition-colors ${
                                            directiveTypeFilter === "ALL"
                                                ? "bg-white text-slate-900 shadow-2xs"
                                                : "text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setDirectiveTypeFilter("POLICY")}
                                        className={`px-3 py-1 rounded-md transition-colors ${
                                            directiveTypeFilter === "POLICY"
                                                ? "bg-white text-slate-900 shadow-2xs"
                                                : "text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        Policies
                                    </button>
                                    <button
                                        onClick={() => setDirectiveTypeFilter("DIRECTIVE")}
                                        className={`px-3 py-1 rounded-md transition-colors ${
                                            directiveTypeFilter === "DIRECTIVE"
                                                ? "bg-white text-slate-900 shadow-2xs"
                                                : "text-slate-500 hover:text-slate-800"
                                        }`}
                                    >
                                        Directives
                                    </button>
                                </div>

                                <div className="relative w-full sm:w-56">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search title or code..."
                                        value={directiveSearch}
                                        onChange={e => setDirectiveSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsPublishingDirective(true)}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Issue Directive</span>
                                </button>
                            </div>
                        </div>

                        {/* Directives Table */}
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="py-2.5 px-3">Title & Code</th>
                                        <th className="py-2.5 px-3">Type</th>
                                        <th className="py-2.5 px-3">Priority</th>
                                        <th className="py-2.5 px-3">Target Scope</th>
                                        <th className="py-2.5 px-3">Effective Date</th>
                                        <th className="py-2.5 px-3">Acknowledgment</th>
                                        <th className="py-2.5 px-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {directivesLoading ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-400">
                                                <div className="flex items-center justify-center gap-2">
                                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                                                    <span>Loading directives...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredDirectives.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-400">
                                                No directives or policies found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDirectives.map(item => {
                                            const total = item.totalRecipients || 0;
                                            const read = item.readCount || 0;
                                            const ack = item.acknowledgedCount || 0;
                                            const ackPct = total > 0 ? Math.round((ack / total) * 100) : 0;

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                                    onClick={() => loadDirectiveDetail(item.id)}
                                                >
                                                    <td className="py-2.5 px-3">
                                                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                                            <span>{item.title}</span>
                                                            {item.attachmentUrl && (
                                                                <Paperclip className="w-3 h-3 text-slate-400" />
                                                            )}
                                                        </div>
                                                        {item.code && (
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                {item.code}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                                                            {item.type}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <span
                                                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                                item.priority === "CRITICAL" || item.priority === "URGENT"
                                                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                                    : item.priority === "HIGH"
                                                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                    : "bg-slate-100 text-slate-700"
                                                            }`}
                                                        >
                                                            {item.priority}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-600">
                                                        <span className="font-medium text-slate-800">
                                                            {item.targetLevelAll && (!item.targetOrganizationUnits || item.targetOrganizationUnits.length === 0)
                                                                ? "National Scope"
                                                                : `Targeted (${item.targetOrganizationUnits?.length ?? 0} Regions)`}
                                                        </span>
                                                        {item.cascadeDescendants && (
                                                            <span className="text-[10px] text-slate-400 block">
                                                                Cascades to lower tiers
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-600">
                                                        <div>{new Date(item.effectiveDate).toLocaleDateString()}</div>
                                                        {item.deadline && (
                                                            <span className="text-[10px] text-rose-600 block">
                                                                Due: {new Date(item.deadline).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <div className="w-32 space-y-1">
                                                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                                                                <span>{ack}/{total} signed</span>
                                                                <span>{ackPct}%</span>
                                                            </div>
                                                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-emerald-500 rounded-full"
                                                                    style={{ width: `${ackPct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 text-right" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            onClick={() => loadDirectiveDetail(item.id)}
                                                            className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <Eye className="w-3 h-3 text-slate-500" />
                                                            <span>Track</span>
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
                </div>
                )
            )}

            {/* TAB 4: LEADERSHIP & ADMINISTRATION */}
            {currentTab === "administration" && !unitIdParam && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4 p-6">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Regional Leadership & Administrators</h2>
                        <p className="text-xs text-slate-500">Designated administrators governing regional states</p>
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
                                            No regional administrators appointed yet.
                                        </td>
                                    </tr>
                                ) : (
                                    assignedAdministrators.map(({ regionId, regionName, admin }) => (
                                        <tr key={regionId} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-900">
                                                {admin.name}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-800">
                                                {regionName}
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
                                                            onClick={() => handleResendInvitation(regionId)}
                                                            disabled={actionLoadingId === regionId}
                                                            className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[11px] font-bold transition-colors cursor-pointer"
                                                        >
                                                            {actionLoadingId === regionId ? "Resending..." : "Resend Invite"}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleCancelInvitation(regionId)}
                                                        disabled={actionLoadingId === regionId}
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

            {/* MODAL: CREATE REGION */}
            {createRegionOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">Add New Region</h3>
                            <button
                                onClick={() => setCreateRegionOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {createRegionMessage && (
                            <div
                                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                                    createRegionMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-rose-50 text-rose-800 border border-rose-200"
                                }`}
                            >
                                {createRegionMessage.type === "success" ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                )}
                                <span>{createRegionMessage.text}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateRegionSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Region Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Sidama Region"
                                    value={newRegionName}
                                    onChange={e => setNewRegionName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Region Code / Acronym (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., SDR"
                                    value={newRegionCode}
                                    onChange={e => setNewRegionCode(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateRegionOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingRegion || !newRegionName.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {creatingRegion ? "Creating..." : "Create Region"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ASSIGN REGIONAL ADMINISTRATOR */}
            {assignAdminOpen && selectedRegionForAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Assign Regional Administrator</h3>
                                <p className="text-xs text-slate-500">{selectedRegionForAdmin.name}</p>
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
                                    placeholder="e.g., Samuel Abera"
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
                                    placeholder="e.g., samuel@amhara.gov.et"
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
                                    placeholder="e.g., +251 91 123 4567"
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



            {/* MODAL / DRAWER: DIRECTIVE DETAILS & RECIPIENT TRACKING */}
            {selectedDirectiveForDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-3xl w-full p-6 space-y-6 my-8 animate-in fade-in zoom-in-95">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            selectedDirectiveForDetail.type === "POLICY"
                                                ? "bg-blue-100 text-blue-800"
                                                : "bg-purple-100 text-purple-800"
                                        }`}
                                    >
                                        {selectedDirectiveForDetail.type}
                                    </span>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            selectedDirectiveForDetail.priority === "CRITICAL" || selectedDirectiveForDetail.priority === "URGENT"
                                                ? "bg-rose-100 text-rose-800"
                                                : selectedDirectiveForDetail.priority === "HIGH"
                                                ? "bg-amber-100 text-amber-800"
                                                : "bg-slate-100 text-slate-700"
                                        }`}
                                    >
                                        {selectedDirectiveForDetail.priority}
                                    </span>
                                    {selectedDirectiveForDetail.code && (
                                        <span className="text-xs font-bold text-slate-400">
                                            {selectedDirectiveForDetail.code}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                                    {selectedDirectiveForDetail.title}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Issued on {new Date(selectedDirectiveForDetail.issueDate).toLocaleDateString()} • Effective {new Date(selectedDirectiveForDetail.effectiveDate).toLocaleDateString()}
                                    {selectedDirectiveForDetail.deadline && (
                                        <span className="text-rose-600 font-bold ml-2">
                                            (Due: {new Date(selectedDirectiveForDetail.deadline).toLocaleDateString()})
                                        </span>
                                    )}
                                </p>
                            </div>

                            <button
                                onClick={() => setSelectedDirectiveForDetail(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* In-App Notification Dispatch Banner */}
                        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5 text-blue-900 font-semibold">
                                <Bell className="w-4 h-4 text-blue-600 shrink-0" />
                                <span>In-App Hierarchy Notifications: <strong className="text-blue-950 font-bold">Dispatched & Active</strong></span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white shadow-2xs">
                                Live on Recipient Dashboards
                            </span>
                        </div>

                        {/* Content Body */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {selectedDirectiveForDetail.content}
                        </div>

                        {selectedDirectiveForDetail.attachmentUrl && (
                            <div className="space-y-2">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Official Attachment: {selectedDirectiveForDetail.attachmentName || "Supporting File"}</span>
                                    </span>
                                    <a
                                        href={selectedDirectiveForDetail.attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:underline text-[11px] font-semibold"
                                    >
                                        Open Full Size ↗
                                    </a>
                                </div>

                                {selectedDirectiveForDetail.attachmentUrl.includes("image") ||
                                selectedDirectiveForDetail.attachmentUrl.includes("images.unsplash.com") ||
                                /\.(jpg|jpeg|png|gif|webp|svg|avif)($|\?)/i.test(selectedDirectiveForDetail.attachmentUrl) ? (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 overflow-hidden">
                                        <div className="relative rounded-lg overflow-hidden bg-slate-900/5 max-h-80 flex items-center justify-center">
                                            <img
                                                src={selectedDirectiveForDetail.attachmentUrl}
                                                alt={selectedDirectiveForDetail.attachmentName || "Directive Attachment"}
                                                className="w-full max-h-80 object-contain rounded-lg"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs">
                                        <div className="flex items-center gap-2 font-bold text-blue-900">
                                            <Paperclip className="w-4 h-4 text-blue-600" />
                                            <span>{selectedDirectiveForDetail.attachmentName || "Official Policy Document"}</span>
                                        </div>
                                        <a
                                            href={selectedDirectiveForDetail.attachmentUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-3 py-1 bg-blue-600 text-white rounded font-bold hover:bg-blue-500 transition-colors"
                                        >
                                            Open Document
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* RECIPIENT COMPLIANCE & ACKNOWLEDGMENT TRACKING */}
                        {selectedDirectiveForDetail.tracking && (
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                        Jurisdiction Delivery & Acknowledgment Tracking
                                    </h4>
                                    <span className="text-xs font-bold text-emerald-700">
                                        {selectedDirectiveForDetail.tracking.acknowledgedCount} / {selectedDirectiveForDetail.tracking.totalRecipients} Acknowledged ({selectedDirectiveForDetail.tracking.totalRecipients > 0 ? Math.round((selectedDirectiveForDetail.tracking.acknowledgedCount / selectedDirectiveForDetail.tracking.totalRecipients) * 100) : 0}%)
                                    </span>
                                </div>

                                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px] sticky top-0">
                                            <tr>
                                                <th className="py-2.5 px-3">Jurisdiction</th>
                                                <th className="py-2.5 px-3">Tier</th>
                                                <th className="py-2.5 px-3">Read Status</th>
                                                <th className="py-2.5 px-3">Acknowledgment</th>
                                                <th className="py-2.5 px-3">Remarks / Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {selectedDirectiveForDetail.tracking.recipients.map(r => (
                                                <tr key={r.organizationId} className="hover:bg-slate-50">
                                                    <td className="py-2.5 px-3 font-bold text-slate-900">
                                                        {r.organizationName}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                            {r.organizationType}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        {r.isRead ? (
                                                            <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> Read
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 italic">Unread</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3">
                                                        {r.isAcknowledged ? (
                                                            <div>
                                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                    Acknowledged
                                                                </span>
                                                                {r.acknowledgedAt && (
                                                                    <span className="text-[10px] text-slate-400 block mt-0.5">
                                                                        {new Date(r.acknowledgedAt).toLocaleString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                                                        {r.notes || "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setSelectedDirectiveForDetail(null)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
