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
import ProgramsRegistryView from "./ProgramsRegistryView";
import HierarchicalReportsView from "./HierarchicalReportsView";
import DataRequestsListView from "./DataRequestsListView";

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
                throw new Error(resJson.message || "Failed to register School");
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

            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6 border-b border-slate-200 w-full sm:w-auto">
                    <button
                        onClick={() => router.push(`/dashboard/woreda${targetQueryOnly}`)}
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
                            currentTab === "schools" || unitIdParam
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <School className="w-3.5 h-3.5" />
                        <span>Schools ({data?.counts?.totalSchools ?? 0})</span>
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/woreda?tab=administration${targetParam}`)}
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
                        onClick={() => router.push(`/dashboard/woreda?tab=directives${targetParam}`)}
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
                        onClick={() => router.push(`/dashboard/woreda?tab=programs${targetParam}`)}
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
                        onClick={() => router.push(`/dashboard/woreda?tab=reports${targetParam}`)}
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
                            setNewSchoolName("");
                            setNewSchoolCode("");
                            setNewSchoolAddress("");
                            setNewSchoolPhone("");
                            setCreateSchoolMessage(null);
                            setCreateSchoolOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add School</span>
                    </button>
                    <button
                        onClick={() => {
                            loadWoredaData();
                            if (currentTab === "schools" || unitIdParam) {
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
                    {/* Top Row: 2 Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* CARD 1 (Top-Left): Woreda Demographic Proportion (Donut Chart) */}
                        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Woreda Academic Demographics
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Ratio of enrolled students to active teachers across the woreda">
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
                                        strokeDasharray={`${(Number(studentsPercentage) / 100) * 301.6} 301.6`}
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
                                        strokeDasharray={`${(Number(teachersPercentage) / 100) * 301.6} 301.6`}
                                        strokeDashoffset={`-${(Number(studentsPercentage) / 100) * 301.6}`}
                                        className="transition-all duration-700"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                                        {fmt(totalPeople)}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Academic Body
                                    </span>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" />
                                        <span className="text-slate-600 font-medium">Students ({fmt(totalStudents)})</span>
                                    </div>
                                    <span className="font-bold text-slate-900">{studentsPercentage}%</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                                        <span className="text-slate-600 font-medium">Teachers ({fmt(totalTeachers)})</span>
                                    </div>
                                    <span className="font-bold text-slate-900">{teachersPercentage}%</span>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2 (Top-Right): Registered Schools Overview */}
                        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                        Subordinate Schools
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Explore registered schools and active institutional metrics
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

                            {/* Circular School Cards */}
                            <div className="flex flex-wrap items-center justify-start gap-4 py-2">
                                {realSchools.length === 0 ? (
                                    <div className="w-full text-center text-slate-400 text-xs py-8">
                                        No schools registered under this woreda yet.
                                    </div>
                                ) : (
                                    realSchools.map(school => {
                                        const isSelected = hoveredSchool?.id === school.id;
                                        return (
                                            <div
                                                key={school.id}
                                                onMouseEnter={() => setHoveredSchool(school)}
                                                onClick={() => navigateToUnit(school.id)}
                                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full border transition-all duration-200 cursor-pointer ${
                                                    isSelected
                                                        ? "border-blue-600 bg-blue-50/60 shadow-xs ring-1 ring-blue-500/20"
                                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white shrink-0 shadow-xs">
                                                    <School className="w-5 h-5" />
                                                </div>

                                                <div className="flex flex-col pr-2">
                                                    <span className="text-xs font-bold text-slate-900 leading-tight">
                                                        {school.name}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-slate-500">
                                                        {school.studentsCount} Students • {school.teachersCount} Teachers
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Selected School Live Breakdown */}
                            {hoveredSchool && (
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                            School Administration
                                        </span>
                                        <p className="text-sm font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                                            <span>{hoveredSchool.name}</span>
                                            {hoveredSchool.admin ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    {hoveredSchool.admin.name}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                    Admin Vacant
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => navigateToUnit(hoveredSchool.id)}
                                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-600 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
                                    >
                                        <span>Explore School Profile</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Full-Width Card: Students & Teachers per School */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Students & Teaching Staff per School
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Comparative school telemetry showing students (left) and teachers (right)">
                                    i
                                </span>
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
                                            <span className="absolute -right-12 text-[11px] font-bold text-[#0284c7] w-10 text-left pl-2">
                                                {val}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="h-full flex items-end justify-around gap-8 relative z-10 pt-2 pb-14">
                                    {realSchools.length === 0 ? (
                                        <div className="w-full text-center text-slate-400 text-xs py-16">
                                            No school data available. Register a school to view analytics.
                                        </div>
                                    ) : (
                                        realSchools.map(school => {
                                            const totalHeightVal = maxStudentsCount > 0 ? maxStudentsCount : 1;
                                            const studentsHeight = Math.min(100, Math.max(12, (school.studentsCount / totalHeightVal) * 100));
                                            const teachersHeight = Math.min(100, Math.max(12, ((school.teachersCount * 5) / totalHeightVal) * 100));

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

                        <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" />
                                <span>Students</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                                <span>Teachers</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2 / DRILLDOWN VIEW: WOREDA HIERARCHY DRILL-DOWN */}
            {(currentTab === "schools" || unitIdParam) && (
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
                                                            if (bc.type === "WOREDA") {
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
                                        {data?.woredaName || "Woreda Education Office"}
                                    </span>
                                )}
                            </nav>
                        </div>

                        {/* Actions in header */}
                        <div className="flex items-center gap-2 shrink-0">
                            {(!drilldownData || drilldownData.node.type === "WOREDA") && (
                                <button
                                    onClick={() => {
                                        setNewSchoolName("");
                                        setNewSchoolCode("");
                                        setNewSchoolAddress("");
                                        setNewSchoolPhone("");
                                        setCreateSchoolMessage(null);
                                        setCreateSchoolOpen(true);
                                    }}
                                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add School</span>
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
                                        {drilldownData.node.parentName ? `Parent jurisdiction: ${drilldownData.node.parentName}` : "Woreda Educational Jurisdiction"}
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
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100/80">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                        Registered Schools
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
                                        Subordinate Schools
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Click any school to view full profile details and metrics
                                    </p>
                                </div>

                                <div className="relative w-full sm:w-72">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search schools..."
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
                                            <th className="py-3 px-4">School Name</th>
                                            <th className="py-3 px-4">Students</th>
                                            <th className="py-3 px-4">Teachers</th>
                                            <th className="py-3 px-4">Administrator</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                        {drilldownLoading ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-slate-400">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                                                        <span>Loading schools...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredDrilldownChildren.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-slate-400">
                                                    No schools found under this woreda.
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
                                                            <School className="w-4 h-4 text-emerald-600 shrink-0" />
                                                            <span>{child.name}</span>
                                                        </div>
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
                                                                <span>View Profile</span>
                                                                <ChevronRight className="w-3.5 h-3.5" />
                                                            </button>

                                                            {!child.admin && (
                                                                <button
                                                                    onClick={() => openAssignAdmin(child)}
                                                                    className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <UserPlus className="w-3.5 h-3.5" />
                                                                    <span>Assign Admin</span>
                                                                </button>
                                                            )}
                                                            {child.admin && child.admin.status === "INVITATION_PENDING" && (
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
                        <h2 className="text-base font-bold text-slate-900">School Leadership & Administrators</h2>
                        <p className="text-xs text-slate-500">Designated school administrators and principals</p>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="py-3 px-4">Administrator</th>
                                    <th className="py-3 px-4">School</th>
                                    <th className="py-3 px-4">Email</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                {assignedAdministrators.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                            No school administrators appointed yet.
                                        </td>
                                    </tr>
                                ) : (
                                    assignedAdministrators.map(({ schoolId, schoolName, admin }) => (
                                        <tr key={schoolId} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-900">
                                                {admin.name}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-800">
                                                {schoolName}
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
                                                            onClick={() => handleResendInvitation(schoolId)}
                                                            disabled={actionLoadingId === schoolId}
                                                            className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[11px] font-bold transition-colors cursor-pointer"
                                                        >
                                                            {actionLoadingId === schoolId ? "Resending..." : "Resend Invite"}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleCancelInvitation(schoolId)}
                                                        disabled={actionLoadingId === schoolId}
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
                        <WoredaAnnouncementPublishView
                            onBack={() => setIsPublishingAnnouncement(false)}
                            onPublished={() => {
                                setIsPublishingAnnouncement(false);
                                loadDirectives();
                            }}
                            woredaName={data?.woredaName}
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
                                            Publish official announcements and circulars to schools in your woreda, and monitor delivery confirmations.
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
                                <div
                                    onClick={() => setDirectiveSubTab("ISSUED")}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                        directiveSubTab === "ISSUED"
                                            ? "bg-blue-50/50 border-blue-300 shadow-2xs"
                                            : "bg-white border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                                        Woreda Announcements
                                    </span>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">
                                        {issuedDirectives.length}
                                    </p>
                                    <span className="text-[11px] text-slate-400 mt-0.5 block">Issued circulars</span>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                                        Schools Reach
                                    </span>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">
                                        {fmt(issuedDirectives.reduce((acc: number, d: any) => acc + (d.totalRecipients || 0), 0))} schools
                                    </p>
                                    <span className="text-[11px] text-slate-400 mt-0.5 block">Across woreda schools</span>
                                </div>
                                <div
                                    onClick={() => {
                                        setDirectiveSubTab("INCOMING");
                                        setDirectiveStatusFilter("PENDING");
                                    }}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                        directiveSubTab === "INCOMING" && directiveStatusFilter === "PENDING"
                                            ? "bg-amber-50/50 border-amber-300 shadow-2xs"
                                            : "bg-white border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
                                        Action Required
                                    </span>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <p className="text-2xl font-bold text-amber-800">
                                            {pendingAckDirectivesCount}
                                        </p>
                                        {pendingAckDirectivesCount > 0 && (
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                                Sign-off Pending
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-400 mt-0.5 block">Requires receipt confirmation</span>
                                </div>
                                <div
                                    onClick={() => {
                                        setDirectiveSubTab("INCOMING");
                                        setDirectiveStatusFilter("ALL");
                                        setDirectiveSourceFilter("ALL");
                                    }}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                        directiveSubTab === "INCOMING" && directiveStatusFilter === "ALL"
                                            ? "bg-blue-50/50 border-blue-300 shadow-2xs"
                                            : "bg-white border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                                        Higher Directives
                                    </span>
                                    <p className="text-2xl font-bold text-blue-600 mt-1">
                                        {incomingDirectives.length}
                                    </p>
                                    <span className="text-[11px] text-slate-400 mt-0.5 block">From Zone, Region & Federal</span>
                                </div>
                            </div>

                            {/* Main List Container */}
                            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                                {/* Clean Filter Toolbar */}
                                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
                                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto flex-1">
                                        {/* Search input */}
                                        <div className="relative w-full sm:w-64">
                                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search title, content, or code..."
                                                value={directiveSearch}
                                                onChange={e => setDirectiveSearch(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400 text-slate-800 placeholder-slate-400 bg-white"
                                            />
                                            {directiveSearch && (
                                                <button
                                                    onClick={() => setDirectiveSearch("")}
                                                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Source Filter Dropdown (Incoming Directives) */}
                                        {directiveSubTab === "INCOMING" && (
                                            <div className="w-full sm:w-48">
                                                <select
                                                    value={directiveSourceFilter}
                                                    onChange={e => setDirectiveSourceFilter(e.target.value as any)}
                                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-slate-400 cursor-pointer"
                                                >
                                                    <option value="ALL">All Sources ({incomingDirectives.length})</option>
                                                    <option value="FEDERAL">Federal Ministry ({federalDirectivesCount})</option>
                                                    <option value="REGION">Regional Bureau ({regionalDirectivesCount})</option>
                                                    <option value="ZONE">Zonal Dept ({zoneDirectivesCount})</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Status Filter Dropdown (Incoming Directives) */}
                                        {directiveSubTab === "INCOMING" && (
                                            <div className="w-full sm:w-44">
                                                <select
                                                    value={directiveStatusFilter}
                                                    onChange={e => setDirectiveStatusFilter(e.target.value as any)}
                                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-slate-400 cursor-pointer"
                                                >
                                                    <option value="ALL">All Status</option>
                                                    <option value="PENDING">Action Required ({pendingAckDirectivesCount})</option>
                                                    <option value="CONFIRMED">Confirmed ({confirmedDirectivesCount})</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Clear button if active */}
                                        {(directiveSearch.trim() !== "" || (directiveSubTab === "INCOMING" && (directiveSourceFilter !== "ALL" || directiveStatusFilter !== "ALL"))) && (
                                            <button
                                                onClick={() => {
                                                    setDirectiveSearch("");
                                                    setDirectiveSourceFilter("ALL");
                                                    setDirectiveStatusFilter("ALL");
                                                }}
                                                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                            >
                                                <X className="w-3 h-3" />
                                                <span>Clear</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Sub-Tabs: Announcements vs Incoming */}
                                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                                        <button
                                            type="button"
                                            onClick={() => setDirectiveSubTab("ISSUED")}
                                            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                                                directiveSubTab === "ISSUED"
                                                    ? "bg-white text-slate-900 shadow-2xs"
                                                    : "text-slate-500 hover:text-slate-800"
                                            }`}
                                        >
                                            Woreda Announcements ({issuedDirectives.length})
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDirectiveSubTab("INCOMING")}
                                            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                                                directiveSubTab === "INCOMING"
                                                    ? "bg-white text-slate-900 shadow-2xs"
                                                    : "text-slate-500 hover:text-slate-800"
                                            }`}
                                        >
                                            Incoming Directives ({incomingDirectives.length})
                                        </button>
                                    </div>
                                </div>

                                {/* Directive Cards Grid */}
                                {directivesLoading ? (
                                    <div className="py-12 text-center text-slate-400">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                                        <span className="text-xs font-medium">Loading directives...</span>
                                    </div>
                                ) : filteredDirectives.length === 0 ? (
                                    <div className="py-12 text-center text-slate-500">
                                        <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                        <p className="text-xs font-semibold text-slate-700">No directives found</p>
                                        <p className="text-2xs text-slate-400 mt-0.5">
                                            {directiveSubTab === "ISSUED"
                                                ? "Publish your first official circular or directive to schools."
                                                : "No incoming directives from higher governance tiers match your filters."}
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {filteredDirectives.map((item: any) => {
                                            const total = item.totalRecipients || 0;
                                            const ack = item.acknowledgedCount || 0;
                                            const ackPct = total > 0 ? Math.round((ack / total) * 100) : 0;
                                            const isActionRequired = !item.isIssuedByMe && item.isAcknowledgmentRequired && !item.userAcknowledgment?.isAcknowledged;
                                            const isConfirmed = !item.isIssuedByMe && item.userAcknowledgment?.isAcknowledged;
                                            const isFederal = item.issuer?.type === "FEDERAL" || item.issuerOrganization?.type === "FEDERAL" || item.issuer?.name?.toLowerCase().includes("federal");
                                            const isRegional = item.issuer?.type === "REGION" || item.issuerOrganization?.type === "REGION" || item.issuer?.name?.toLowerCase().includes("region");
                                            const isZone = item.issuer?.type === "ZONE" || item.issuerOrganization?.type === "ZONE" || item.issuer?.name?.toLowerCase().includes("zone");

                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => setSelectedDrawerDirective(item)}
                                                    className={`group relative rounded-xl border p-4 bg-white flex flex-col justify-between transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                                                        isActionRequired
                                                            ? "border-amber-300 hover:border-amber-400 bg-linear-to-b from-amber-50/25 to-white"
                                                            : isConfirmed
                                                            ? "border-slate-200 hover:border-blue-400 bg-white"
                                                            : "border-slate-200 hover:border-blue-400 bg-white"
                                                    }`}
                                                >
                                                    {/* Top Badges & Priority/Attachment */}
                                                    <div>
                                                        <div className="flex items-center justify-between gap-1.5 mb-2.5">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {/* Source Badge */}
                                                                {item.isIssuedByMe ? (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-white shrink-0">
                                                                        Woreda
                                                                    </span>
                                                                ) : isFederal ? (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white flex items-center gap-1 shrink-0">
                                                                        <Building2 className="w-2.5 h-2.5 text-blue-400" />
                                                                        <span>Federal</span>
                                                                    </span>
                                                                ) : isRegional ? (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 shrink-0">
                                                                        <Building2 className="w-2.5 h-2.5 text-blue-600" />
                                                                        <span>Regional</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1 shrink-0">
                                                                        <Building2 className="w-2.5 h-2.5 text-indigo-600" />
                                                                        <span>Zone</span>
                                                                    </span>
                                                                )}

                                                                {/* Type Badge */}
                                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase border ${
                                                                    item.type === "POLICY"
                                                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                                                }`}>
                                                                    {item.type || "DIRECTIVE"}
                                                                </span>
                                                            </div>

                                                            {/* Right: Priority or Attachment */}
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {item.priority === "CRITICAL" || item.priority === "URGENT" ? (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                                                                        {item.priority}
                                                                    </span>
                                                                ) : item.priority === "HIGH" ? (
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                                        HIGH
                                                                    </span>
                                                                ) : null}

                                                                {item.attachmentUrl && (
                                                                    <span title="Has attachment" className="p-0.5 text-slate-400">
                                                                        <Paperclip className="w-3 h-3" />
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Directive Title - 2 lines clamp */}
                                                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-1">
                                                            {item.title}
                                                        </h4>

                                                        {/* Reference Code & Origin Info */}
                                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-4 truncate">
                                                            {item.code && (
                                                                <span className="font-mono text-[10px] text-slate-400 font-medium">
                                                                    #{item.code}
                                                                </span>
                                                            )}
                                                            {item.code && item.issuer?.name && !item.isIssuedByMe && <span>•</span>}
                                                            {item.issuer?.name && !item.isIssuedByMe && (
                                                                <span className="truncate">{item.issuer.name}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Footer: Date & Status Action */}
                                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                                                        {/* Left: Due Date or Issued Date */}
                                                        {item.deadline ? (
                                                            <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 shrink-0">
                                                                <Clock className="w-3 h-3" />
                                                                <span>Due {new Date(item.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] text-slate-400 shrink-0">
                                                                {new Date(item.issueDate || item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                                            </span>
                                                        )}

                                                        {/* Right: Status Pill or Action Button */}
                                                        <div className="shrink-0">
                                                            {item.isIssuedByMe ? (
                                                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                                                                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                                                    <span>{ack}/{total}</span>
                                                                </span>
                                                            ) : isConfirmed ? (
                                                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                                                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                                                    <span>Confirmed</span>
                                                                </span>
                                                            ) : isActionRequired ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setAckModalDirective(item);
                                                                        setAckNotes("");
                                                                        setAckConfirmed(false);
                                                                    }}
                                                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <CheckSquare className="w-3 h-3" />
                                                                    <span>Confirm</span>
                                                                </button>
                                                            ) : (
                                                                <span className="text-[11px] font-semibold text-slate-400 group-hover:text-blue-600 flex items-center gap-0.5">
                                                                    <span>Review</span>
                                                                    <ChevronRight className="w-3 h-3" />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* SLIDE-OVER DRAWER (FULL DIRECTIVE DETAILS) */}
                            {selectedDrawerDirective && (
                                <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
                                    {/* Backdrop */}
                                    <div
                                        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
                                        onClick={() => setSelectedDrawerDirective(null)}
                                    />

                                    <div className="fixed inset-y-0 right-0 max-w-xl w-full bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200 border-l border-slate-200">
                                        {/* Drawer Header */}
                                        <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
                                                    <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                    <span>
                                                        {selectedDrawerDirective.issuer?.name || (selectedDrawerDirective.isIssuedByMe ? (data?.woredaName || "Woreda Education Office") : "Higher Governance Authority")}
                                                    </span>
                                                </span>

                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
                                                    selectedDrawerDirective.type === "POLICY"
                                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                                }`}>
                                                    {selectedDrawerDirective.type || "DIRECTIVE"}
                                                </span>

                                                {selectedDrawerDirective.code && (
                                                    <span className="font-mono text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                                        #{selectedDrawerDirective.code}
                                                    </span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => setSelectedDrawerDirective(null)}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                                                title="Close Panel"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Drawer Scrollable Body */}
                                        <div className="p-6 overflow-y-auto space-y-5 flex-1">
                                            {/* Title & Priority */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    {selectedDrawerDirective.priority === "CRITICAL" || selectedDrawerDirective.priority === "URGENT" ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                                                            {selectedDrawerDirective.priority}
                                                        </span>
                                                    ) : selectedDrawerDirective.priority === "HIGH" ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                                            HIGH PRIORITY
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                                            STANDARD PRIORITY
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-900 leading-snug">
                                                    {selectedDrawerDirective.title}
                                                </h3>
                                            </div>

                                            {/* Metadata Grid */}
                                            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                                                <div>
                                                    <span className="text-slate-400 text-[11px] block">Issued Date</span>
                                                    <span className="font-semibold text-slate-800">
                                                        {new Date(selectedDrawerDirective.issueDate || selectedDrawerDirective.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 text-[11px] block">Compliance Due Date</span>
                                                    {selectedDrawerDirective.deadline ? (
                                                        <span className="font-semibold text-rose-600">
                                                            {new Date(selectedDrawerDirective.deadline).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 font-medium">Standard Execution</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 text-[11px] block">Target Jurisdiction Scope</span>
                                                    <span className="font-semibold text-slate-800">
                                                        {selectedDrawerDirective.targetLevels && selectedDrawerDirective.targetLevels.length > 0
                                                            ? selectedDrawerDirective.targetLevels.join(", ")
                                                            : "All Sub-jurisdictions"}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 text-[11px] block">Author / Desk</span>
                                                    <span className="font-semibold text-slate-800">
                                                        {selectedDrawerDirective.issuer?.authorName || "Governance Desk"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Official Mandate Details Content */}
                                            <div className="space-y-1.5">
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                                    Official Directive Content & Mandate
                                                </span>
                                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                                    {selectedDrawerDirective.content}
                                                </div>
                                            </div>

                                            {/* Official Attachment Enclosure */}
                                            {selectedDrawerDirective.attachmentUrl && (
                                                <div className="space-y-2 pt-1">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                                        Enclosed Official Documentation
                                                    </span>

                                                    {selectedDrawerDirective.attachmentUrl.includes("image") ||
                                                    selectedDrawerDirective.attachmentUrl.includes("images.unsplash.com") ||
                                                    /\.(jpg|jpeg|png|gif|webp|svg|avif)($|\?)/i.test(selectedDrawerDirective.attachmentUrl) ? (
                                                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div
                                                                    onClick={() => setPreviewImageUrl(selectedDrawerDirective.attachmentUrl)}
                                                                    className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-white shrink-0 relative group cursor-pointer shadow-2xs"
                                                                    title="Click to enlarge"
                                                                >
                                                                    <img
                                                                        src={selectedDrawerDirective.attachmentUrl}
                                                                        alt={selectedDrawerDirective.attachmentName || "Enclosure"}
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                                    />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-slate-800 truncate">
                                                                        {selectedDrawerDirective.attachmentName || "Attached Image Document"}
                                                                    </p>
                                                                    <span className="text-[11px] text-slate-500">Official Image Enclosure</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewImageUrl(selectedDrawerDirective.attachmentUrl)}
                                                                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                                                                >
                                                                    Preview
                                                                </button>
                                                                <a
                                                                    href={selectedDrawerDirective.attachmentUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    download
                                                                    className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                                                                    title="Download file"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                                                                    <FileText className="w-5 h-5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-slate-800 truncate">
                                                                        {selectedDrawerDirective.attachmentName || "Official Circular Document (PDF)"}
                                                                    </p>
                                                                    <span className="text-[11px] text-slate-500">Official Executive Document</span>
                                                                </div>
                                                            </div>

                                                            <a
                                                                href={selectedDrawerDirective.attachmentUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                                                            >
                                                                <span>Open File</span>
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Delivery Ledger Table (if issued by this Woreda) */}
                                            {selectedDrawerDirective.isIssuedByMe && (
                                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                                            Cascaded Delivery Status
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => loadDirectiveLedger(selectedDrawerDirective.id)}
                                                            className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                                                        >
                                                            <RefreshCw className={`w-3 h-3 ${ledgerLoading ? "animate-spin" : ""}`} />
                                                            <span>Refresh Ledger</span>
                                                        </button>
                                                    </div>

                                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-around text-center">
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Schools</span>
                                                            <p className="text-lg font-bold text-slate-900">{selectedDrawerDirective.totalRecipients || 0}</p>
                                                        </div>
                                                        <div className="h-8 w-px bg-slate-200" />
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Confirmed</span>
                                                            <p className="text-lg font-bold text-blue-600">{selectedDrawerDirective.acknowledgedCount || 0}</p>
                                                        </div>
                                                        <div className="h-8 w-px bg-slate-200" />
                                                        <div>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">Rate</span>
                                                            <p className="text-lg font-bold text-blue-600">
                                                                {selectedDrawerDirective.totalRecipients > 0
                                                                    ? Math.round(((selectedDrawerDirective.acknowledgedCount || 0) / selectedDrawerDirective.totalRecipients) * 100)
                                                                    : 0}%
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Drawer Footer Actions */}
                                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                                            <div className="text-xs">
                                                {!selectedDrawerDirective.isIssuedByMe && (
                                                    selectedDrawerDirective.userAcknowledgment?.isAcknowledged ? (
                                                        <span className="inline-flex items-center gap-1 text-blue-700 font-semibold">
                                                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                                            <span>Receipt recorded</span>
                                                        </span>
                                                    ) : selectedDrawerDirective.isAcknowledgmentRequired ? (
                                                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                                                            <Clock className="w-4 h-4 text-amber-600" />
                                                            <span>Action required</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 font-medium">Standard Advisory</span>
                                                    )
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedDrawerDirective(null)}
                                                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                                >
                                                    Close
                                                </button>

                                                {!selectedDrawerDirective.isIssuedByMe && selectedDrawerDirective.isAcknowledgmentRequired && !selectedDrawerDirective.userAcknowledgment?.isAcknowledged && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setAckModalDirective(selectedDrawerDirective);
                                                            setAckNotes("");
                                                            setAckConfirmed(false);
                                                        }}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <CheckSquare className="w-3.5 h-3.5" />
                                                        <span>Confirm Receipt</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: PROGRAMS & INITIATIVES */}
            {currentTab === "programs" && !unitIdParam && (
                <ProgramsRegistryView
                    tierName={data?.woredaName || "Woreda Education Office"}
                    tierType="WOREDA"
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
