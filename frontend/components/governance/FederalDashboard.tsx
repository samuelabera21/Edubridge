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
    Bell,
    KeyRound,
    Copy,
    ChevronLeft,
    Compass,
    BarChart3
} from "lucide-react";
import DirectivesPublishView from "./DirectivesPublishView";
import DirectivesRegistryView from "./DirectivesRegistryView";
import ProgramsRegistryView from "./ProgramsRegistryView";
import HierarchicalReportsView from "./HierarchicalReportsView";
import DataRequestsListView from "./DataRequestsListView";
import RegionalAdministratorsView from "./RegionalAdministratorsView";
import RegionalHierarchyView from "./RegionalHierarchyView";

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
    const directiveIdParam = searchParams?.get("directiveId");

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
    const [directiveScopeFilter, setDirectiveScopeFilter] = useState<string>("ALL");
    const [directivePriorityFilter, setDirectivePriorityFilter] = useState<string>("ALL");
    const [directivePage, setDirectivePage] = useState<number>(1);
    const [directivePageSize, setDirectivePageSize] = useState<number>(10);
    const [selectedDirectiveForDetail, setSelectedDirectiveForDetail] = useState<DirectiveItem | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [isPublishingDirective, setIsPublishingDirective] = useState(false);

    // Action state for resend/cancel
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [resetAdminCredentials, setResetAdminCredentials] = useState<{
        email: string;
        temporaryPassword: string;
    } | null>(null);

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
            if (directiveIdParam) {
                loadDirectiveDetail(directiveIdParam);
            }
        }
    }, [currentTab, unitIdParam, directiveIdParam]);

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

    // Reset page to 1 on filter or search change
    useEffect(() => {
        setDirectivePage(1);
    }, [directiveTypeFilter, directiveScopeFilter, directivePriorityFilter, directiveSearch, directivePageSize]);

    // Filter directives list
    const filteredDirectives = useMemo(() => {
        return directivesList.filter(d => {
            const matchesType = directiveTypeFilter === "ALL" || d.type === directiveTypeFilter;
            const matchesPriority = directivePriorityFilter === "ALL" || d.priority === directivePriorityFilter;

            let matchesScope = true;
            if (directiveScopeFilter === "NATIONAL") {
                matchesScope = Boolean(d.targetLevelAll && (!d.targetOrganizationUnits || d.targetOrganizationUnits.length === 0));
            } else if (directiveScopeFilter === "REGION") {
                matchesScope = Boolean(
                    d.targetLevels?.includes("REGION") ||
                    d.targetOrganizationUnits?.some(u => u.organization?.type === "REGION")
                );
            } else if (directiveScopeFilter === "ZONE") {
                matchesScope = Boolean(
                    d.targetLevels?.includes("ZONE") ||
                    d.targetOrganizationUnits?.some(u => u.organization?.type === "ZONE")
                );
            } else if (directiveScopeFilter === "WOREDA") {
                matchesScope = Boolean(
                    d.targetLevels?.includes("WOREDA") ||
                    d.targetOrganizationUnits?.some(u => u.organization?.type === "WOREDA")
                );
            } else if (directiveScopeFilter === "SCHOOL") {
                matchesScope = Boolean(
                    d.targetLevels?.includes("SCHOOL") ||
                    d.targetOrganizationUnits?.some(u => u.organization?.type === "SCHOOL")
                );
            } else if (directiveScopeFilter === "TARGETED") {
                matchesScope = Boolean(d.targetOrganizationUnits && d.targetOrganizationUnits.length > 0);
            }

            const q = directiveSearch.trim().toLowerCase();
            const matchesSearch =
                !q ||
                d.title.toLowerCase().includes(q) ||
                (d.content && d.content.toLowerCase().includes(q)) ||
                (d.code && d.code.toLowerCase().includes(q)) ||
                (d.targetOrganizationUnits && d.targetOrganizationUnits.some(u => u.organization?.name?.toLowerCase().includes(q)));

            return matchesType && matchesPriority && matchesScope && matchesSearch;
        });
    }, [directivesList, directiveTypeFilter, directiveScopeFilter, directivePriorityFilter, directiveSearch]);

    // Pagination for directives
    const totalDirectivePages = Math.max(1, Math.ceil(filteredDirectives.length / directivePageSize));
    const paginatedDirectives = useMemo(() => {
        const start = (directivePage - 1) * directivePageSize;
        return filteredDirectives.slice(start, start + directivePageSize);
    }, [filteredDirectives, directivePage, directivePageSize]);

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

    const handleResetRegionalAdminPassword = async (regionId: string) => {
        if (!confirm("Reset this Regional Administrator's password? Their active sessions will be ended.")) return;
        setActionLoadingId(regionId);
        try {
            const res = await fetchApi(`/hierarchy/regions/${regionId}/reset-admin-password`, {
                method: "POST"
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Failed to reset Regional Administrator password");

            setResetAdminCredentials({ email: result.email, temporaryPassword: result.temporaryPassword });
            showToast("success", "Password reset. Share the temporary password privately.");
        } catch (err: any) {
            showToast("error", err.message || "Failed to reset Regional Administrator password");
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

            {/* Direct contextual actions (when on overview) */}
            {currentTab === "overview" && !unitIdParam && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Federal Governance Overview
                    </h1>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => {
                                setNewRegionName("");
                                setNewRegionCode("");
                                setCreateRegionMessage(null);
                                setCreateRegionOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-sm font-medium rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add region</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                loadFederalData();
                            }}
                            className="p-2 border border-slate-300 bg-white hover:bg-[#4085b3] text-slate-700 hover:text-white hover:border-[#4085b3] rounded transition-all duration-200 cursor-pointer group/refresh"
                            title="Reload overview data"
                            aria-label="Reload overview data"
                        >
                            <RefreshCw className={`w-4 h-4 transition-colors ${loading || drilldownLoading ? "animate-spin text-[#4085b3]" : "text-slate-500 group-hover/refresh:text-white"}`} />
                        </button>
                    </div>
                </div>
            )}

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
                    {/* Top Full-Width Card: Schools & Administrative Units per Region */}
                    <div className="space-y-4 pt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Schools & Administrative Offices per Region
                                </h2>
                                
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
                                            <div className="w-full border-b border-dashed border-slate-300" />
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

                        <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-4 border-t border-slate-200">
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

                    {/* Executive National Telemetry Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded text-xs text-slate-700">
                        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Schools</span>
                                <span className="text-base font-bold text-slate-900 tabular-nums">{fmt(data?.counts?.totalSchools ?? 0)}</span>
                            </div>
                            <div className="hidden sm:block h-7 w-px bg-slate-200" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Enrolled Students</span>
                                <span className="text-base font-bold text-slate-900 tabular-nums">{fmt(data?.counts?.totalStudents ?? 0)}</span>
                            </div>
                            <div className="hidden sm:block h-7 w-px bg-slate-200" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Teachers</span>
                                <span className="text-base font-bold text-slate-900 tabular-nums">{fmt(data?.counts?.totalTeachers ?? 0)}</span>
                            </div>
                            <div className="hidden sm:block h-7 w-px bg-slate-200" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Regional States</span>
                                <span className="text-base font-bold text-slate-900 tabular-nums">{fmt(data?.counts?.totalRegions ?? 0)}</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => navigateToUnit(null)}
                            className="text-xs font-semibold text-[#4085b3] hover:underline inline-flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                        >
                            <span>Explore directory</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Regional Capacity & Governance Table */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                Regional Distribution & Capacity
                            </h2>
                            <span className="text-xs text-slate-500 font-medium">
                                {realRegions.length} {realRegions.length === 1 ? "regional state" : "regional states"}
                            </span>
                        </div>

                        <div className="border border-slate-200 bg-white rounded overflow-hidden">
                            <table className="w-full table-fixed text-left text-xs border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                                    <tr>
                                        <th className="py-3 px-4 w-[28%]">Regional State</th>
                                        <th className="py-3 px-4 w-[24%]">Operational Footprint</th>
                                        <th className="py-3 px-4 w-[14%]">Students</th>
                                        <th className="py-3 px-4 w-[14%]">Teachers</th>
                                        <th className="py-3 px-4 w-[12%]">Administrator</th>
                                        <th className="py-3 px-4 w-[8%] text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                    {realRegions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400">
                                                No regional states registered yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        realRegions.map(region => {
                                            const subParts = [];
                                            if (region.schoolsCount > 0) subParts.push(`${region.schoolsCount} schools`);
                                            if (region.woredasCount > 0) subParts.push(`${region.woredasCount} woredas`);
                                            if (region.zonesCount > 0) subParts.push(`${region.zonesCount} zones`);
                                            const subUnitsText = subParts.length > 0 ? subParts.join(", ") : "—";

                                            return (
                                                <tr
                                                    key={region.id}
                                                    onClick={() => navigateToUnit(region.id)}
                                                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                                >
                                                    <td className="py-3.5 px-4 font-semibold text-slate-900 truncate">
                                                        {region.name}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-600 truncate">
                                                        {subUnitsText}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-900 font-medium tabular-nums truncate">
                                                        {fmt(region.studentsCount)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-900 font-medium tabular-nums truncate">
                                                        {fmt(region.teachersCount)}
                                                    </td>
                                                    <td className="py-3.5 px-4 truncate">
                                                        {region.admin ? (
                                                            <span className="font-medium text-slate-900 block truncate">
                                                                {region.admin.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">Vacant</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={() => navigateToUnit(region.id)}
                                                            className="text-xs font-semibold text-[#4085b3] hover:underline cursor-pointer"
                                                        >
                                                            Inspect ↗
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
            )}

            {/* TAB 2: IN-PAGE HIERARCHY DRILL-DOWN */}
            {(currentTab === "regions" || unitIdParam) && (
                <RegionalHierarchyView
                    drilldownData={drilldownData}
                    loading={drilldownLoading}
                    error={drilldownError}
                    onNavigateToUnit={navigateToUnit}
                    onNavigateBack={navigateBack}
                    onRefresh={() => {
                        loadFederalData();
                        loadDrilldownData(unitIdParam);
                    }}
                    onOpenAddRegion={() => {
                        setNewRegionName("");
                        setNewRegionCode("");
                        setCreateRegionMessage(null);
                        setCreateRegionOpen(true);
                    }}
                    onOpenAssignAdmin={openAssignAdmin}
                />
            )}

            {/* TAB 3: NATIONAL POLICIES & DIRECTIVES */}
            {currentTab === "directives" && !unitIdParam && (
                <DirectivesRegistryView
                    tierName="Federal Ministry of Education"
                    tierType="FEDERAL"
                    canCreateDirective={true}
                    initialDirectiveId={directiveIdParam}
                />
            )}

            {/* TAB: PROGRAMS & INITIATIVES */}
            {currentTab === "programs" && !unitIdParam && (
                <ProgramsRegistryView
                    tierName="Federal Ministry of Education"
                    tierType="FEDERAL"
                    canCreateProgram={true}
                    initialProgramId={searchParams?.get("programId")}
                    initialProgramTitle={searchParams?.get("programTitle")}
                />
            )}

            {/* TAB: HIERARCHICAL REPORTS & EXPORT */}
            {currentTab === "reports" && !unitIdParam && (
                <HierarchicalReportsView
                    tierName="Federal Ministry of Education"
                    tierType="FEDERAL"
                />
            )}

            {/* TAB: DATA REQUESTS & GOOGLE FORMS */}
            {currentTab === "data-requests" && !unitIdParam && (
                <DataRequestsListView currentTier="FEDERAL" />
            )}

            {/* TAB 4: LEADERSHIP & ADMINISTRATION */}
            {currentTab === "administration" && !unitIdParam && (
                <RegionalAdministratorsView
                    regions={data?.regions || []}
                    onRefresh={loadFederalData}
                    onNavigateToRegion={(id) => navigateToUnit(id)}
                />
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



            {resetAdminCredentials && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Temporary Password</h3>
                                <p className="mt-1 text-xs text-slate-600">For {resetAdminCredentials.email}. It must be changed at next sign-in.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setResetAdminCredentials(null)}
                                aria-label="Close temporary password"
                                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <input
                            readOnly
                            value={resetAdminCredentials.temporaryPassword}
                            className="w-full rounded border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900"
                            onFocus={event => event.currentTarget.select()}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(resetAdminCredentials.temporaryPassword)}
                                className="inline-flex items-center gap-2 rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <Copy className="h-3.5 w-3.5" /> Copy password
                            </button>
                            <button
                                type="button"
                                onClick={() => setResetAdminCredentials(null)}
                                className="rounded bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
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
