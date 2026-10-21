"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    School,
    Users,
    GraduationCap,
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
    Building2,
    MapPin,
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
import WoredaAnnouncementPublishView from "./WoredaAnnouncementPublishView";
import DirectivesRegistryView from "./DirectivesRegistryView";
import ProgramsRegistryView from "./ProgramsRegistryView";
import HierarchicalReportsView from "./HierarchicalReportsView";
import DataRequestsListView from "./DataRequestsListView";
import RegionalAdministratorsView from "./RegionalAdministratorsView";
import RegionalHierarchyView from "./RegionalHierarchyView";

export interface SchoolAdmin {
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INVITATION_PENDING";
    invitedAt?: string;
    roleName: string;
}

export interface SchoolItem {
    id: string;
    name: string;
    type: "SCHOOL";
    parentId: string | null;
    studentsCount: number;
    teachersCount: number;
    admin: SchoolAdmin | null;
}

export interface WoredaOverviewData {
    woredaId: string | null;
    woredaName: string;
    parentZoneName: string;
    counts: {
        totalSchools: number;
        totalStudents: number;
        totalTeachers: number;
    };
    schools: SchoolItem[];
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

export default function WoredaDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams?.get("tab") || "overview";
    const targetOrgId = searchParams?.get("targetOrgId");
    const unitIdParam = searchParams?.get("unitId") || null;
    const subTabParam = searchParams?.get("subTab");
    const directiveIdParam = searchParams?.get("directiveId");

    const [data, setData] = useState<WoredaOverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Drilldown specific state
    const [drilldownData, setDrilldownData] = useState<DrilldownData | null>(null);
    const [drilldownLoading, setDrilldownLoading] = useState(false);
    const [drilldownError, setDrilldownError] = useState<string | null>(null);
    const [drilldownSearch, setDrilldownSearch] = useState("");

    // Selected / Hovered School on Map
    const [hoveredSchool, setHoveredSchool] = useState<SchoolItem | null>(null);

    // Modal State: Create School
    const [createSchoolOpen, setCreateSchoolOpen] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState("");
    const [newSchoolCode, setNewSchoolCode] = useState("");
    const [newSchoolAddress, setNewSchoolAddress] = useState("");
    const [newSchoolPhone, setNewSchoolPhone] = useState("");
    const [creatingSchool, setCreatingSchool] = useState(false);
    const [createSchoolMessage, setCreateSchoolMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Modal State: Assign School Principal / Administrator
    const [assignAdminOpen, setAssignAdminOpen] = useState(false);
    const [selectedSchoolForAdmin, setSelectedSchoolForAdmin] = useState<SchoolItem | null>(null);
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
    const [selectedDrawerDirective, setSelectedDrawerDirective] = useState<any | null>(null);
    const [directiveSourceFilter, setDirectiveSourceFilter] = useState<"ALL" | "FEDERAL" | "REGION" | "ZONE">("ALL");
    const [directiveStatusFilter, setDirectiveStatusFilter] = useState<"ALL" | "PENDING" | "CONFIRMED">("ALL");

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

    const loadWoredaData = async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = targetOrgId
                ? `/hierarchy/woredas/${targetOrgId}/overview`
                : `/hierarchy/woreda/overview`;
            const res = await fetchApi(endpoint);
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load Woreda Overview");
            }
            const payload = await res.json();
            setData(payload.data);
            if (payload.data?.schools && payload.data.schools.length > 0) {
                setHoveredSchool(payload.data.schools[0]);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch Woreda dashboard data");
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
        loadWoredaData();
    }, [targetOrgId]);

    useEffect(() => {
        if (currentTab === "schools" || unitIdParam) {
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

    // Navigation inside woreda dashboard for hierarchy drill-down
    const navigateToUnit = (unitId?: string | null) => {
        setDrilldownSearch("");
        if (unitId) {
            router.push(`/dashboard/woreda?tab=schools&unitId=${unitId}${targetParam}`);
        } else {
            router.push(`/dashboard/woreda?tab=schools${targetParam}`);
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
            if (targetAncestor.type === "WOREDA") {
                navigateToUnit(null);
            } else {
                navigateToUnit(targetAncestor.id);
            }
        } else {
            navigateToUnit(null);
        }
    };

    // Filter schools by search query
    const filteredSchools = useMemo(() => {
        if (!data?.schools) return [];
        if (!searchQuery.trim()) return data.schools;
        const q = searchQuery.toLowerCase();
        return data.schools.filter(
            s =>
                s.name.toLowerCase().includes(q) ||
                (s.admin?.name && s.admin.name.toLowerCase().includes(q)) ||
                (s.admin?.email && s.admin.email.toLowerCase().includes(q))
        );
    }, [data?.schools, searchQuery]);

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
        if (!data?.schools) return [];
        return data.schools
            .filter(s => s.admin !== null)
            .map(s => ({
                schoolId: s.id,
                schoolName: s.name,
                admin: s.admin!
            }));
    }, [data?.schools]);

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

    const federalDirectivesCount = useMemo(() => {
        return incomingDirectives.filter((d: any) =>
            d.issuer?.type === "FEDERAL" ||
            d.issuerOrganization?.type === "FEDERAL" ||
            d.issuer?.name?.toLowerCase().includes("federal")
        ).length;
    }, [incomingDirectives]);

    const regionalDirectivesCount = useMemo(() => {
        return incomingDirectives.filter((d: any) =>
            d.issuer?.type === "REGION" ||
            d.issuerOrganization?.type === "REGION" ||
            d.issuer?.name?.toLowerCase().includes("region")
        ).length;
    }, [incomingDirectives]);

    const zoneDirectivesCount = useMemo(() => {
        return incomingDirectives.filter((d: any) =>
            d.issuer?.type === "ZONE" ||
            d.issuerOrganization?.type === "ZONE" ||
            d.issuer?.name?.toLowerCase().includes("zone")
        ).length;
    }, [incomingDirectives]);

    const confirmedDirectivesCount = useMemo(() => {
        return incomingDirectives.filter((d: any) => d.userAcknowledgment?.isAcknowledged).length;
    }, [incomingDirectives]);

    const pendingAckDirectivesCount = useMemo(() => {
        return incomingDirectives.filter((d: any) => d.isAcknowledgmentRequired && !d.userAcknowledgment?.isAcknowledged).length;
    }, [incomingDirectives]);

    const filteredDirectives = useMemo(() => {
        let base = directiveSubTab === "ISSUED" ? issuedDirectives : incomingDirectives;

        if (directiveSubTab === "INCOMING") {
            if (directiveSourceFilter === "FEDERAL") {
                base = base.filter((d: any) =>
                    d.issuer?.type === "FEDERAL" ||
                    d.issuerOrganization?.type === "FEDERAL" ||
                    d.issuer?.name?.toLowerCase().includes("federal")
                );
            } else if (directiveSourceFilter === "REGION") {
                base = base.filter((d: any) =>
                    d.issuer?.type === "REGION" ||
                    d.issuerOrganization?.type === "REGION" ||
                    d.issuer?.name?.toLowerCase().includes("region")
                );
            } else if (directiveSourceFilter === "ZONE") {
                base = base.filter((d: any) =>
                    d.issuer?.type === "ZONE" ||
                    d.issuerOrganization?.type === "ZONE" ||
                    d.issuer?.name?.toLowerCase().includes("zone")
                );
            }

            if (directiveStatusFilter === "PENDING") {
                base = base.filter((d: any) => d.isAcknowledgmentRequired && !d.userAcknowledgment?.isAcknowledged);
            } else if (directiveStatusFilter === "CONFIRMED") {
                base = base.filter((d: any) => d.userAcknowledgment?.isAcknowledged);
            }
        }

        if (!directiveSearch.trim()) return base;
        const q = directiveSearch.toLowerCase();
        return base.filter(
            (d: any) =>
                d.title.toLowerCase().includes(q) ||
                d.content.toLowerCase().includes(q) ||
                (d.code && d.code.toLowerCase().includes(q))
        );
    }, [directiveSubTab, issuedDirectives, incomingDirectives, directiveSourceFilter, directiveStatusFilter, directiveSearch]);

    // Format number helper
    const fmt = (num: number | undefined | null) => {
        if (num === undefined || num === null) return "0";
        return num.toLocaleString();
    };

    // Proportions
    const totalSchools = data?.counts?.totalSchools ?? 0;
    const totalStudents = data?.counts?.totalStudents ?? 0;
    const totalTeachers = data?.counts?.totalTeachers ?? 0;
    const totalPeople = totalStudents + totalTeachers;
    const studentsPercentage = totalPeople > 0 ? ((totalStudents / totalPeople) * 100).toFixed(1) : "100.0";
    const teachersPercentage = totalPeople > 0 ? ((totalTeachers / totalPeople) * 100).toFixed(1) : "0.0";

    const realSchools = data?.schools ?? [];
    const maxStudentsCount = useMemo(() => {
        if (realSchools.length === 0) return 50;
        const max = Math.max(...realSchools.map(s => s.studentsCount));
        return Math.max(max, 40);
    }, [realSchools]);

    const yAxisSteps = useMemo(() => {
        const top = Math.ceil(maxStudentsCount);
        const step = Math.max(1, Math.ceil(top / 4));
        const steps = [];
        for (let i = top; i >= 0; i -= step) {
            steps.push(i);
        }
        if (steps[steps.length - 1] !== 0) {
            steps.push(0);
        }
        return steps;
    }, [maxStudentsCount]);

    // Handle Create School Submit
    const handleCreateSchoolSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const effectiveWoredaId = data?.woredaId || targetOrgId;
        if (!newSchoolName.trim() || !effectiveWoredaId) return;

        setCreatingSchool(true);
        setCreateSchoolMessage(null);
        try {
            const res = await fetchApi("/hierarchy/schools/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newSchoolName.trim(),
                    woredaId: effectiveWoredaId,
                    code: newSchoolCode.trim() || undefined,
                    address: newSchoolAddress.trim() || undefined,
                    phoneNumber: newSchoolPhone.trim() || undefined
                })
            });

            const resJson = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(resJson.message || resJson.error || "Failed to register School");
            }

            setCreateSchoolMessage({
                type: "success",
                text: `School "${newSchoolName.trim()}" registered successfully.`
            });

            await Promise.all([loadWoredaData(), loadDrilldownData(unitIdParam)]);

            setTimeout(() => {
                setCreateSchoolOpen(false);
                setNewSchoolName("");
                setNewSchoolCode("");
                setNewSchoolAddress("");
                setNewSchoolPhone("");
                setCreateSchoolMessage(null);
            }, 800);
        } catch (err: any) {
            setCreateSchoolMessage({
                type: "error",
                text: err.message || "Could not register School"
            });
        } finally {
            setCreatingSchool(false);
        }
    };

    // Open Assign Admin Modal
    const openAssignAdmin = (school: { id: string; name: string }) => {
        setSelectedSchoolForAdmin(school as SchoolItem);
        setAdminFullName("");
        setAdminEmail("");
        setAdminPhone("");
        setAssignAdminMessage(null);
        setAssignAdminOpen(true);
    };

    // Handle Assign School Admin Submit
    const handleAssignAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSchoolForAdmin || !adminFullName.trim() || !adminEmail.trim()) return;

        setAssigningAdmin(true);
        setAssignAdminMessage(null);
        try {
            const res = await fetchApi(`/hierarchy/schools/${selectedSchoolForAdmin.id}/assign-admin`, {
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

            await Promise.all([loadWoredaData(), loadDrilldownData(unitIdParam)]);

            setTimeout(() => {
                setAssignAdminOpen(false);
                setSelectedSchoolForAdmin(null);
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
    const handleResendInvitation = async (schoolId: string) => {
        setActionLoadingId(schoolId);
        try {
            const res = await fetchApi(`/hierarchy/schools/${schoolId}/resend-invitation`, {
                method: "POST"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to resend invitation");

            showToast("success", resJson.message || "Invitation resent.");
            await Promise.all([loadWoredaData(), loadDrilldownData(unitIdParam)]);
        } catch (err: any) {
            showToast("error", err.message || "Failed to resend invitation");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Cancel Invitation
    const handleCancelInvitation = async (schoolId: string) => {
        if (!confirm("Are you sure you want to cancel this school administrator invitation?")) return;
        setActionLoadingId(schoolId);
        try {
            const res = await fetchApi(`/hierarchy/schools/${schoolId}/cancel-invitation`, {
                method: "DELETE"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to cancel invitation");

            showToast("success", "Invitation cancelled.");
            await Promise.all([loadWoredaData(), loadDrilldownData(unitIdParam)]);
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
                        Woreda Governance Overview
                    </h1>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => {
                                setNewSchoolName("");
                                setNewSchoolCode("");
                                setNewSchoolAddress("");
                                setNewSchoolPhone("");
                                setCreateSchoolMessage(null);
                                setCreateSchoolOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-sm font-medium rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add School</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                loadWoredaData();
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
                        onClick={loadWoredaData}
                        className="px-3 py-1 bg-rose-600 text-white font-semibold rounded hover:bg-rose-700 cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {currentTab === "overview" && !unitIdParam && (
                <div className="space-y-6">
                    {/* Top Full-Width Card: Students & Teachers per School */}
                    <div className="space-y-4 pt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    School Student Body & Faculty Roster
                                </h2>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                                <span className="flex items-center gap-1.5 text-slate-700">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" /> Left: Students
                                </span>
                                <span className="flex items-center gap-1.5 text-[#0284c7]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> Right: Teachers
                                </span>
                            </div>
                        </div>

                        {/* Chart Grid and Bars */}
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
                                    {realSchools.length === 0 ? (
                                        <div className="w-full text-center text-slate-400 text-xs py-16">
                                            No schools registered in this woreda yet.
                                        </div>
                                    ) : (
                                        realSchools.map(school => {
                                            const totalHeightVal = maxStudentsCount > 0 ? maxStudentsCount : 1;
                                            const studentsHeight = Math.min(100, Math.max(12, (school.studentsCount / totalHeightVal) * 100));
                                            const teachersHeight = Math.min(100, Math.max(12, (school.teachersCount / totalHeightVal) * 100));

                                            return (
                                                <div
                                                    key={school.id}
                                                    onClick={() => navigateToUnit(school.id)}
                                                    className="flex flex-col items-center justify-end h-full group cursor-pointer relative min-w-[70px]"
                                                >
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 text-center">
                                                        <p className="text-[11px] font-bold text-white">{school.name}</p>
                                                        <p className="text-[10px] text-sky-300 font-semibold">
                                                            {school.studentsCount} Students • {school.teachersCount} Teachers
                                                        </p>
                                                    </div>

                                                    <div className="flex items-end justify-center gap-1.5 h-full w-14">
                                                        <div
                                                            style={{ height: `${studentsHeight}%` }}
                                                            className="flex-1 bg-[#0f172a] rounded-t-sm transition-all duration-300 group-hover:brightness-125 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Students: ${school.studentsCount}`}
                                                        >
                                                            {school.studentsCount}
                                                        </div>
                                                        <div
                                                            style={{ height: `${teachersHeight}%` }}
                                                            className="flex-1 bg-[#38bdf8] rounded-t-sm transition-all duration-300 group-hover:brightness-110 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Teachers: ${school.teachersCount}`}
                                                        >
                                                            {school.teachersCount}
                                                        </div>
                                                    </div>

                                                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 origin-top-left rotate-45 pointer-events-none whitespace-nowrap text-left pt-2">
                                                        <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[120px]">
                                                            {school.name}
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">
                                                            {school.studentsCount} Students
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
                                <span>Students (Left Axis)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                                <span>Teachers (Right Axis)</span>
                            </div>
                        </div>
                    </div>

                    {/* Executive District Telemetry Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded text-xs text-slate-700">
                        <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Registered Schools</span>
                                <span className="text-base font-bold text-slate-900 tabular-nums">{fmt(totalSchools)}</span>
                            </div>
                            <div className="hidden sm:block h-7 w-px bg-slate-200" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Enrolled Students</span>
                                <span className="text-base font-bold text-slate-900 tabular-nums">{fmt(totalStudents)}</span>
                            </div>
                            <div className="hidden sm:block h-7 w-px bg-slate-200" />
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Teachers</span>
                                <span className="text-base font-bold text-slate-900 tabular-nums">{fmt(totalTeachers)}</span>
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

                    {/* School Capacity & Governance Table */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                Educational Institutions & Capacity
                            </h2>
                            <span className="text-xs text-slate-500 font-medium">
                                {realSchools.length} {realSchools.length === 1 ? "school" : "schools"}
                            </span>
                        </div>

                        <div className="border border-slate-200 bg-white rounded overflow-hidden">
                            <table className="w-full table-fixed text-left text-xs border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                                    <tr>
                                        <th className="py-3 px-4 w-[36%]">School Institution</th>
                                        <th className="py-3 px-4 w-[20%]">Students</th>
                                        <th className="py-3 px-4 w-[20%]">Teachers</th>
                                        <th className="py-3 px-4 w-[14%]">Principal / Admin</th>
                                        <th className="py-3 px-4 w-[10%] text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                    {realSchools.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-400">
                                                No schools registered yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        realSchools.map(school => (
                                            <tr
                                                key={school.id}
                                                onClick={() => navigateToUnit(school.id)}
                                                className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                                            >
                                                <td className="py-3.5 px-4 font-semibold text-slate-900 truncate">
                                                    {school.name}
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-900 font-medium tabular-nums truncate">
                                                    {fmt(school.studentsCount)}
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-900 font-medium tabular-nums truncate">
                                                    {fmt(school.teachersCount)}
                                                </td>
                                                <td className="py-3.5 px-4 truncate">
                                                    {school.admin ? (
                                                        <span className="font-medium text-slate-900 block truncate">
                                                            {school.admin.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">Vacant</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigateToUnit(school.id)}
                                                        className="text-xs font-semibold text-[#4085b3] hover:underline cursor-pointer"
                                                    >
                                                        Inspect ↗
                                                    </button>
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

            {/* TAB 2: IN-PAGE HIERARCHY DRILL-DOWN */}
            {(currentTab === "schools" || unitIdParam) && (
                <RegionalHierarchyView
                    drilldownData={drilldownData}
                    loading={drilldownLoading}
                    error={drilldownError}
                    onNavigateToUnit={navigateToUnit}
                    onNavigateBack={navigateBack}
                    onRefresh={() => {
                        loadWoredaData();
                        loadDrilldownData(unitIdParam);
                    }}
                    onOpenAddRegion={() => {
                        setNewSchoolName("");
                        setNewSchoolCode("");
                        setNewSchoolAddress("");
                        setNewSchoolPhone("");
                        setCreateSchoolMessage(null);
                        setCreateSchoolOpen(true);
                    }}
                    onOpenAssignAdmin={openAssignAdmin}
                    title="School directory & institutions"
                    addUnitLabel="Add school"
                />
            )}

            {/* TAB 3: LEADERSHIP & ADMINISTRATION */}
            {currentTab === "administration" && !unitIdParam && (
                <RegionalAdministratorsView
                    regions={data?.schools || []}
                    onRefresh={loadWoredaData}
                    onNavigateToRegion={(id) => navigateToUnit(id)}
                    title="School administrators"
                    unitTypeLabel="School"
                    apiEndpointPrefix="schools"
                />
            )}

            {/* TAB: DIRECTIVES & ANNOUNCEMENTS */}
            {currentTab === "directives" && !unitIdParam && (
                <DirectivesRegistryView
                    tierName={data?.woredaName || "Woreda Education Office"}
                    tierType="WOREDA"
                    organizationId={data?.woredaId}
                    canCreateDirective={true}
                    initialDirectiveId={directiveIdParam}
                />
            )}

            {/* TAB: PROGRAMS & INITIATIVES */}
            {currentTab === "programs" && !unitIdParam && (
                <ProgramsRegistryView
                    tierName={data?.woredaName || "Woreda Education Office"}
                    tierType="WOREDA"
                    organizationId={data?.woredaId}
                    canCreateProgram={true}
                    initialProgramId={searchParams?.get("programId")}
                    initialProgramTitle={searchParams?.get("programTitle")}
                />
            )}

            {/* TAB: HIERARCHICAL REPORTS & EXPORT */}
            {currentTab === "reports" && !unitIdParam && (
                <HierarchicalReportsView
                    tierName={data?.woredaName || "Woreda Education Office"}
                    tierType="WOREDA"
                />
            )}

            {/* TAB: DATA REQUESTS & GOOGLE FORMS */}
            {currentTab === "data-requests" && !unitIdParam && (
                <DataRequestsListView currentTier="WOREDA" />
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
                                    Detailed delivery and sign-off records for schools in your woreda.
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
                                        <th className="py-2.5 px-3">School Name</th>
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

            {/* MODAL: CREATE SCHOOL */}
            {createSchoolOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">Register New School</h3>
                            <button
                                onClick={() => setCreateSchoolOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {createSchoolMessage && (
                            <div
                                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                                    createSchoolMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-rose-50 text-rose-800 border border-rose-200"
                                }`}
                            >
                                {createSchoolMessage.type === "success" ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                )}
                                <span>{createSchoolMessage.text}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateSchoolSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    School Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Tabor Secondary School"
                                    value={newSchoolName}
                                    onChange={e => setNewSchoolName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    School Code / Acronym (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., TSS"
                                    value={newSchoolCode}
                                    onChange={e => setNewSchoolCode(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Campus Address (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Kebele 04, Debre Tabor"
                                    value={newSchoolAddress}
                                    onChange={e => setNewSchoolAddress(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Official Contact Phone (Optional)
                                </label>
                                <input
                                    type="tel"
                                    placeholder="e.g., +251 58 123 4567"
                                    value={newSchoolPhone}
                                    onChange={e => setNewSchoolPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateSchoolOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingSchool || !newSchoolName.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {creatingSchool ? "Registering..." : "Register School"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ASSIGN SCHOOL PRINCIPAL */}
            {assignAdminOpen && selectedSchoolForAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Assign School Principal</h3>
                                <p className="text-xs text-slate-500">{selectedSchoolForAdmin.name}</p>
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
                                    placeholder="e.g., Principal Melaku Bekele"
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
                                    placeholder="e.g., principal@tabor.edu.et"
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
