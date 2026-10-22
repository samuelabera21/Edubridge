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
    Compass,
    BarChart3
} from "lucide-react";
import DirectivesRecipientView from "./DirectivesRecipientView";
import RegionalAnnouncementPublishView from "./RegionalAnnouncementPublishView";
import DirectivesRegistryView from "./DirectivesRegistryView";
import ProgramsRegistryView from "./ProgramsRegistryView";
import HierarchicalReportsView from "./HierarchicalReportsView";
import DataRequestsListView from "./DataRequestsListView";
import RegionalAdministratorsView from "./RegionalAdministratorsView";
import RegionalHierarchyView from "./RegionalHierarchyView";

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
    studentsCount?: number;
    teachersCount?: number;
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
    const subTabParam = searchParams?.get("subTab");
    const directiveIdParam = searchParams?.get("directiveId");

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
    const [selectedDrawerDirective, setSelectedDrawerDirective] = useState<any | null>(null);
    const [directiveSourceFilter, setDirectiveSourceFilter] = useState<"ALL" | "FEDERAL">("ALL");
    const [directiveStatusFilter, setDirectiveStatusFilter] = useState<"ALL" | "PENDING" | "CONFIRMED">("ALL");

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
                if (selectedDrawerDirective && selectedDrawerDirective.id === ackModalDirective.id) {
                    setSelectedDrawerDirective({
                        ...selectedDrawerDirective,
                        userAcknowledgment: {
                            isAcknowledged: true,
                            acknowledgedAt: new Date().toISOString(),
                            acknowledgmentNotes: ackNotes.trim() || undefined,
                            isRead: true
                        }
                    });
                }
                setAckModalDirective(null);
                setAckNotes("");
                setAckConfirmed(false);
                loadDirectives();
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("notification-updated"));
                }
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

    useEffect(() => {
        if (currentTab === "directives") {
            if (subTabParam === "INCOMING" || subTabParam === "ISSUED") {
                setDirectiveSubTab(subTabParam);
            }
        }
    }, [currentTab, subTabParam]);

    useEffect(() => {
        if (currentTab === "directives" && directiveIdParam) {
            if (directivesList.length > 0) {
                const found = directivesList.find(d => d.id === directiveIdParam);
                if (found) {
                    setSelectedDrawerDirective(found);
                    if (found.isIssuedByMe) {
                        setDirectiveSubTab("ISSUED");
                    } else {
                        setDirectiveSubTab("INCOMING");
                    }
                }
            } else {
                fetchApi(`/directives/${directiveIdParam}`).then(async res => {
                    if (res.ok) {
                        const json = await res.json();
                        const d = json?.data || json;
                        if (d && d.id) {
                            setSelectedDrawerDirective(d);
                            if (d.isIssuedByMe) {
                                setDirectiveSubTab("ISSUED");
                            } else {
                                setDirectiveSubTab("INCOMING");
                            }
                        }
                    }
                }).catch(() => {});
            }
        }
    }, [currentTab, directiveIdParam, directivesList]);

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

    const federalDirectivesCount = useMemo(() => {
        return incomingDirectives.filter((d: any) =>
            d.issuer?.type === "FEDERAL" ||
            d.issuerOrganization?.type === "FEDERAL" ||
            d.issuer?.name?.toLowerCase().includes("federal")
        ).length;
    }, [incomingDirectives]);

    const confirmedDirectivesCount = useMemo(() => {
        return incomingDirectives.filter((d: any) => d.userAcknowledgment?.isAcknowledged).length;
    }, [incomingDirectives]);

    const pendingAckDirectivesCount = useMemo(() => {
        return incomingDirectives.filter((d: any) => d.isAcknowledgmentRequired && !d.userAcknowledgment?.isAcknowledged).length;
    }, [incomingDirectives]);

    const filteredDirectives = useMemo(() => {
        let list = directiveSubTab === "ISSUED" ? issuedDirectives : incomingDirectives;

        if (directiveSubTab === "INCOMING") {
            if (directiveSourceFilter === "FEDERAL") {
                list = list.filter((d: any) =>
                    d.issuer?.type === "FEDERAL" ||
                    d.issuerOrganization?.type === "FEDERAL" ||
                    d.issuer?.name?.toLowerCase().includes("federal")
                );
            }

            if (directiveStatusFilter === "PENDING") {
                list = list.filter((d: any) => d.isAcknowledgmentRequired && !d.userAcknowledgment?.isAcknowledged);
            } else if (directiveStatusFilter === "CONFIRMED") {
                list = list.filter((d: any) => d.userAcknowledgment?.isAcknowledged);
            }
        }

        if (!directiveSearch.trim()) return list;
        const q = directiveSearch.toLowerCase();
        return list.filter(
            (d: any) =>
                d.title?.toLowerCase().includes(q) ||
                d.content?.toLowerCase().includes(q) ||
                d.code?.toLowerCase().includes(q)
        );
    }, [directiveSubTab, issuedDirectives, incomingDirectives, directiveSourceFilter, directiveStatusFilter, directiveSearch]);

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

            {/* Direct contextual actions (when on overview) */}
            {currentTab === "overview" && !unitIdParam && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Regional Governance Overview
                    </h1>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => {
                                setNewZoneName("");
                                setNewZoneCode("");
                                setCreateZoneMessage(null);
                                setCreateZoneOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-sm font-medium rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Zone</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                loadRegionData();
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
                    {/* Top Full-Width Card: Schools & Administrative Offices per Zone */}
                    <div className="space-y-4 pt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Schools & Administrative Offices per Zone
                                </h2>
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
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 text-center">
                                                        <p className="text-[11px] font-bold text-white">{zone.name}</p>
                                                        <p className="text-[10px] text-sky-300 font-semibold">
                                                            {zone.schoolsCount} Schools • {zone.woredasCount} Woredas
                                                        </p>
                                                    </div>

                                                    <div className="flex items-end justify-center gap-1.5 h-full w-14">
                                                        <div
                                                            style={{ height: `${schoolsHeight}%` }}
                                                            className="flex-1 bg-[#0f172a] rounded-t-sm transition-all duration-300 group-hover:brightness-125 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Schools: ${zone.schoolsCount}`}
                                                        >
                                                            {zone.schoolsCount}
                                                        </div>
                                                        <div
                                                            style={{ height: `${subUnitsHeight}%` }}
                                                            className="flex-1 bg-[#38bdf8] rounded-t-sm transition-all duration-300 group-hover:brightness-110 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Woredas: ${zone.woredasCount}`}
                                                        >
                                                            {zone.woredasCount}
                                                        </div>
                                                    </div>

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

                        <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-4 border-t border-slate-200">
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

                    {/* Executive Regional Telemetry Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded text-xs text-slate-700">
                        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Schools</span>
                                <span className="text-base font-bold text-slate-900 tabular-nums">{fmt(totalSchools)}</span>
                            </div>
                            <div className="hidden sm:block h-7 w-px bg-slate-200" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Enrolled Students</span>
                                <span className="text-base font-bold text-slate-900 tabular-nums">{fmt(drilldownData?.counts?.studentsCount ?? 0)}</span>
                            </div>
                            <div className="hidden sm:block h-7 w-px bg-slate-200" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Teachers</span>
                                <span className="text-base font-bold text-slate-900 tabular-nums">{fmt(drilldownData?.counts?.teachersCount ?? 0)}</span>
                            </div>
                            <div className="hidden sm:block h-7 w-px bg-slate-200" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Administrative Zones</span>
                                <span className="text-base font-bold text-slate-900 tabular-nums">{fmt(totalZones)}</span>
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

                    {/* Zonal Capacity & Governance Table */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                Zonal Distribution & Capacity
                            </h2>
                            <span className="text-xs text-slate-500 font-medium">
                                {realZones.length} {realZones.length === 1 ? "administrative zone" : "administrative zones"}
                            </span>
                        </div>

                        <div className="border border-slate-200 bg-white rounded overflow-hidden">
                            <table className="w-full table-fixed text-left text-xs border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                                    <tr>
                                        <th className="py-3 px-4 w-[28%]">Administrative Zone</th>
                                        <th className="py-3 px-4 w-[24%]">Operational Footprint</th>
                                        <th className="py-3 px-4 w-[14%]">Students</th>
                                        <th className="py-3 px-4 w-[14%]">Teachers</th>
                                        <th className="py-3 px-4 w-[12%]">Administrator</th>
                                        <th className="py-3 px-4 w-[8%] text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                    {realZones.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400">
                                                No administrative zones registered yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        realZones.map(zone => {
                                            const subParts = [];
                                            if (zone.schoolsCount > 0) subParts.push(`${zone.schoolsCount} schools`);
                                            if (zone.woredasCount > 0) subParts.push(`${zone.woredasCount} woredas`);
                                            const subUnitsText = subParts.length > 0 ? subParts.join(", ") : "—";

                                            return (
                                                <tr
                                                    key={zone.id}
                                                    onClick={() => navigateToUnit(zone.id)}
                                                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                                >
                                                    <td className="py-3.5 px-4 font-semibold text-slate-900 truncate">
                                                        {zone.name}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-600 truncate">
                                                        {subUnitsText}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-900 font-medium tabular-nums truncate">
                                                        {fmt(zone.studentsCount ?? 0)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-900 font-medium tabular-nums truncate">
                                                        {fmt(zone.teachersCount ?? 0)}
                                                    </td>
                                                    <td className="py-3.5 px-4 truncate">
                                                        {zone.admin ? (
                                                            <span className="font-medium text-slate-900 block truncate">
                                                                {zone.admin.name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">Vacant</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={() => navigateToUnit(zone.id)}
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
            {(currentTab === "zones" || unitIdParam) && (
                <RegionalHierarchyView
                    drilldownData={drilldownData}
                    loading={drilldownLoading}
                    error={drilldownError}
                    onNavigateToUnit={navigateToUnit}
                    onNavigateBack={navigateBack}
                    onRefresh={() => {
                        loadRegionData();
                        loadDrilldownData(unitIdParam);
                    }}
                    onOpenAddRegion={() => {
                        setNewZoneName("");
                        setNewZoneCode("");
                        setCreateZoneMessage(null);
                        setCreateZoneOpen(true);
                    }}
                    onOpenAssignAdmin={openAssignAdmin}
                    title="Zonal hierarchy & directory"
                    addUnitLabel="Add zone"
                />
            )}

            {/* TAB 3: LEADERSHIP & ADMINISTRATION */}
            {currentTab === "administration" && !unitIdParam && (
                <RegionalAdministratorsView
                    regions={data?.zones || []}
                    onRefresh={loadRegionData}
                    onNavigateToRegion={(id) => navigateToUnit(id)}
                    title="Zone administrators"
                    unitTypeLabel="Zone"
                    apiEndpointPrefix="zones"
                />
            )}

            {/* TAB: DIRECTIVES & ANNOUNCEMENTS */}
            {currentTab === "directives" && !unitIdParam && (
                <DirectivesRegistryView
                    tierName={data?.regionName || "Regional Education Bureau"}
                    tierType="REGION"
                    organizationId={data?.regionId}
                    canCreateDirective={true}
                    initialDirectiveId={directiveIdParam}
                />
            )}

            {/* TAB: PROGRAMS & INITIATIVES */}
            {currentTab === "programs" && !unitIdParam && (
                <ProgramsRegistryView
                    tierName={data?.regionName || "Regional Education Bureau"}
                    tierType="REGION"
                    organizationId={data?.regionId}
                    canCreateProgram={true}
                    initialProgramId={searchParams?.get("programId")}
                    initialProgramTitle={searchParams?.get("programTitle")}
                />
            )}

            {/* TAB: HIERARCHICAL REPORTS & EXPORT */}
            {currentTab === "reports" && !unitIdParam && (
                <HierarchicalReportsView
                    tierName={data?.regionName || "Regional Education Bureau"}
                    tierType="REGION"
                />
            )}

            {/* TAB: DATA REQUESTS & GOOGLE FORMS */}
            {currentTab === "data-requests" && !unitIdParam && (
                <DataRequestsListView currentTier="REGION" />
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
