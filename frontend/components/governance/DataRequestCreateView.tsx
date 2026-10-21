"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchApi } from "../../lib/api";
import {
    ArrowLeft,
    Layers,
    Building2,
    MapPin,
    School,
    Plus,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ExternalLink,
    HelpCircle,
    Calendar,
    Target,
    ListFilter,
    FileSpreadsheet,
    Link2,
    Copy,
    ChevronUp,
    ChevronDown,
    Check,
    Search,
    X,
    RefreshCw,
    Sparkles
} from "lucide-react";
import SearchableSelect, { SearchableOption } from "../ui/SearchableSelect";

export type DataRequestFieldType =
    | "SHORT_TEXT"
    | "LONG_TEXT"
    | "NUMBER"
    | "YES_NO"
    | "DATE"
    | "SINGLE_SELECT"
    | "MULTI_SELECT";

export interface FieldItem {
    id: string;
    label: string;
    fieldType: DataRequestFieldType;
    required: boolean;
    description: string;
    options: string[];
    rawOptionsInput?: string;
}

export interface DataRequestCreateViewProps {
    onBack?: () => void;
    onCreated?: (createdId: string) => void;
}

export default function DataRequestCreateView({
    onBack,
    onCreated
}: DataRequestCreateViewProps) {
    // Basic Information
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [objective, setObjective] = useState("");
    const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
    const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [deadline, setDeadline] = useState("");
    const [instructions, setInstructions] = useState("");
    const [requiredAction, setRequiredAction] = useState("");

    // Synced questions state from Google Forms (Option A)
    const [syncedQuestions, setSyncedQuestions] = useState<any[]>([]);
    const [syncingQuestions, setSyncingQuestions] = useState(false);
    const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

    // Target Audience Hierarchy Selection
    const [targetType, setTargetType] = useState<
        | "ALL"
        | "ALL_REGIONS"
        | "SPECIFIC_REGION"
        | "ALL_ZONES"
        | "SPECIFIC_ZONE"
        | "ALL_WOREDAS"
        | "SPECIFIC_WOREDA"
        | "ALL_SCHOOLS"
        | "SPECIFIC_SCHOOL"
    >("ALL");

    const [selectedRegionId, setSelectedRegionId] = useState("");
    const [selectedZoneId, setSelectedZoneId] = useState("");
    const [selectedWoredaId, setSelectedWoredaId] = useState("");
    const [selectedSchoolId, setSelectedSchoolId] = useState("");

    const [hierarchy, setHierarchy] = useState<any>(null);
    const [loadingHierarchy, setLoadingHierarchy] = useState(true);

    // Execution & Progress State
    const [submitting, setSubmitting] = useState(false);
    const [progressStatus, setProgressStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successData, setSuccessData] = useState<{
        id: string;
        title: string;
        googleResponderUri: string;
        googleFormEditUrl: string;
        targetCount: number;
    } | null>(null);
    const [copiedLink, setCopiedLink] = useState(false);

    // Google OAuth Status
    const [googleAuthUrl, setGoogleAuthUrl] = useState<string | null>(null);
    const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);

    // Check Google Connection status
    const checkGoogleStatus = async () => {
        try {
            const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
            const res = await fetchApi(`/data-requests/google-oauth/url${currentPath ? `?state=${encodeURIComponent(currentPath)}` : ""}`);
            if (res.ok) {
                const json = await res.json();
                setGoogleAuthUrl(json.data?.authUrl || null);
                setIsGoogleConnected(Boolean(json.data?.isConnected));
            }
        } catch (err) {
            console.warn("Failed to check Google OAuth status:", err);
        }
    };

    useEffect(() => {
        checkGoogleStatus();

        if (typeof window !== "undefined" && window.location.search.includes("googleOAuth=success")) {
            setIsGoogleConnected(true);
        }

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "GOOGLE_OAUTH_SUCCESS") {
                setIsGoogleConnected(true);
                setError(null);
                checkGoogleStatus();
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const handleConnectGoogle = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!googleAuthUrl) return;
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(
            googleAuthUrl,
            "google_oauth_popup",
            `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        );
    };

    // Load available recipients tree
    useEffect(() => {
        async function loadHierarchy() {
            setLoadingHierarchy(true);
            try {
                const res = await fetchApi("/directives/recipients-tree");
                if (res.ok) {
                    const json = await res.json();
                    setHierarchy(json.data);
                }
            } catch (err) {
                console.error("Failed to load hierarchy tree:", err);
            } finally {
                setLoadingHierarchy(false);
            }
        }
        loadHierarchy();
    }, []);

    const userTier = useMemo(() => {
        if (!hierarchy) return "FEDERAL";
        if (hierarchy.regions) return "FEDERAL";
        if (hierarchy.zones) return "REGION";
        if (hierarchy.woredas) return "ZONE";
        if (hierarchy.schools) return "WOREDA";
        return "FEDERAL";
    }, [hierarchy]);

    // Available Regions
    const availableRegions = useMemo(() => {
        return hierarchy?.regions || [];
    }, [hierarchy]);

    // Available Zones
    const availableZones = useMemo(() => {
        if (userTier === "FEDERAL") {
            if (!selectedRegionId) return [];
            const reg = availableRegions.find((r: any) => r.id === selectedRegionId);
            return reg?.zones || [];
        }
        if (userTier === "REGION") {
            return hierarchy?.zones || [];
        }
        return [];
    }, [userTier, hierarchy, availableRegions, selectedRegionId]);

    // Available Woredas
    const availableWoredas = useMemo(() => {
        if (userTier === "FEDERAL" || userTier === "REGION") {
            if (!selectedZoneId) return [];
            const zone = availableZones.find((z: any) => z.id === selectedZoneId);
            return zone?.woredas || [];
        }
        if (userTier === "ZONE") {
            return hierarchy?.woredas || [];
        }
        return [];
    }, [userTier, hierarchy, availableZones, selectedZoneId]);

    // Available Schools
    const availableSchools = useMemo(() => {
        if (userTier === "FEDERAL" || userTier === "REGION" || userTier === "ZONE") {
            if (!selectedWoredaId) return [];
            const woreda = availableWoredas.find((w: any) => w.id === selectedWoredaId);
            return woreda?.schools || [];
        }
        if (userTier === "WOREDA") {
            return hierarchy?.schools || [];
        }
        return [];
    }, [userTier, hierarchy, availableWoredas, selectedWoredaId]);

    // SearchableSelect Options with badges
    const regionOptions: SearchableOption[] = useMemo(() => {
        return availableRegions.map((r: any) => ({
            value: r.id,
            label: r.name,
            badge: `${(r.zones || []).length} zones`
        }));
    }, [availableRegions]);

    const zoneOptions: SearchableOption[] = useMemo(() => {
        return availableZones.map((z: any) => ({
            value: z.id,
            label: z.name,
            badge: `${(z.woredas || []).length} woredas`
        }));
    }, [availableZones]);

    const woredaOptions: SearchableOption[] = useMemo(() => {
        return availableWoredas.map((w: any) => ({
            value: w.id,
            label: w.name,
            badge: `${(w.schools || []).length} schools`
        }));
    }, [availableWoredas]);

    const schoolOptions: SearchableOption[] = useMemo(() => {
        return availableSchools.map((s: any) => ({
            value: s.id,
            label: s.name,
            badge: "School"
        }));
    }, [availableSchools]);

    // Resolved Target IDs to save in database
    const resolvedTargetIds = useMemo(() => {
        if (targetType === "ALL") return [];
        if (targetType === "ALL_REGIONS") return availableRegions.map((r: any) => r.id);
        if (targetType === "SPECIFIC_REGION") return selectedRegionId ? [selectedRegionId] : [];
        if (targetType === "ALL_ZONES") return availableZones.map((z: any) => z.id);
        if (targetType === "SPECIFIC_ZONE") return selectedZoneId ? [selectedZoneId] : [];
        if (targetType === "ALL_WOREDAS") return availableWoredas.map((w: any) => w.id);
        if (targetType === "SPECIFIC_WOREDA") return selectedWoredaId ? [selectedWoredaId] : [];
        if (targetType === "ALL_SCHOOLS") return availableSchools.map((s: any) => s.id);
        if (targetType === "SPECIFIC_SCHOOL") return selectedSchoolId ? [selectedSchoolId] : [];
        return [];
    }, [targetType, availableRegions, availableZones, availableWoredas, availableSchools, selectedRegionId, selectedZoneId, selectedWoredaId, selectedSchoolId]);

    // Resolved Target Summary Info
    const resolvedTargetSummary = useMemo(() => {
        if (targetType === "ALL") {
            return {
                count: 1,
                description: userTier === "FEDERAL" ? "Entire Country (All Jurisdictions, Regions, Zones, Woredas, & Schools)" : `Entire ${userTier.toLowerCase()} jurisdiction`
            };
        }
        if (targetType === "ALL_REGIONS") {
            return {
                count: availableRegions.length,
                description: `All ${availableRegions.length} Regions Nationwide (Regions Only)`
            };
        }
        if (targetType === "SPECIFIC_REGION") {
            const r = availableRegions.find((reg: any) => reg.id === selectedRegionId);
            return selectedRegionId ? {
                count: 1,
                description: `Targeting Region: ${r?.name || selectedRegionId}`
            } : null;
        }
        if (targetType === "ALL_ZONES") {
            const r = availableRegions.find((reg: any) => reg.id === selectedRegionId);
            return selectedRegionId ? {
                count: availableZones.length,
                description: `All ${availableZones.length} Zones in ${r?.name}`
            } : null;
        }
        if (targetType === "SPECIFIC_ZONE") {
            const z = availableZones.find((zone: any) => zone.id === selectedZoneId);
            return selectedZoneId ? {
                count: 1,
                description: `Targeting Zone: ${z?.name || selectedZoneId}`
            } : null;
        }
        if (targetType === "ALL_WOREDAS") {
            const z = availableZones.find((zone: any) => zone.id === selectedZoneId);
            return selectedZoneId ? {
                count: availableWoredas.length,
                description: `All ${availableWoredas.length} Woredas in ${z?.name}`
            } : null;
        }
        if (targetType === "SPECIFIC_WOREDA") {
            const w = availableWoredas.find((woreda: any) => woreda.id === selectedWoredaId);
            return selectedWoredaId ? {
                count: 1,
                description: `Targeting Woreda: ${w?.name || selectedWoredaId}`
            } : null;
        }
        if (targetType === "ALL_SCHOOLS") {
            const w = availableWoredas.find((woreda: any) => woreda.id === selectedWoredaId);
            return selectedWoredaId ? {
                count: availableSchools.length,
                description: `All ${availableSchools.length} Schools in ${w?.name}`
            } : null;
        }
        if (targetType === "SPECIFIC_SCHOOL") {
            const s = availableSchools.find((school: any) => school.id === selectedSchoolId);
            return selectedSchoolId ? {
                count: 1,
                description: `Targeting School: ${s?.name || selectedSchoolId}`
            } : null;
        }
        return null;
    }, [targetType, availableRegions, availableZones, availableWoredas, availableSchools, selectedRegionId, selectedZoneId, selectedWoredaId, selectedSchoolId, userTier]);

    // Dynamic field sync from Google Forms
    const syncQuestionsFromGoogleForm = async (requestId: string, silent = false) => {
        if (!requestId) return;
        if (!silent) setSyncingQuestions(true);
        try {
            const res = await fetchApi(`/data-requests/${requestId}/schema/sync`, {
                method: "POST"
            });
            if (res.ok) {
                const json = await res.json();
                if (json.data?.fields) {
                    setSyncedQuestions(json.data.fields);
                    setLastSyncedTime(new Date().toLocaleTimeString());
                }
            }
        } catch (err) {
            console.warn("Failed to sync questions from Google Form:", err);
        } finally {
            if (!silent) setSyncingQuestions(false);
        }
    };

    // Handle Form Creation
    const handleCreateAndGenerateGoogleForm = async () => {
        setError(null);

        // Validation
        if (!title.trim()) {
            setError("Please provide a descriptive title for this Data Request.");
            return;
        }
        if (!objective.trim()) {
            setError("Please state the specific objective of this data collection.");
            return;
        }
        if (!startDate || !deadline) {
            setError("Please provide both the start date and the submission deadline.");
            return;
        }
        if (new Date(deadline) < new Date(startDate)) {
            setError("Submission deadline cannot be earlier than start date.");
            return;
        }

        // Validate Target Audience Selection
        if (userTier === "FEDERAL") {
            if (targetType === "SPECIFIC_REGION" && !selectedRegionId) {
                setError("Please select a target Region.");
                return;
            }
            if (targetType === "ALL_ZONES" && !selectedRegionId) {
                setError("Please select a parent Region.");
                return;
            }
            if (targetType === "SPECIFIC_ZONE" && (!selectedRegionId || !selectedZoneId)) {
                setError("Please select Region and target Zone.");
                return;
            }
            if (targetType === "ALL_WOREDAS" && (!selectedRegionId || !selectedZoneId)) {
                setError("Please select Region and Zone.");
                return;
            }
            if (targetType === "SPECIFIC_WOREDA" && (!selectedRegionId || !selectedZoneId || !selectedWoredaId)) {
                setError("Please select Region, Zone, and target Woreda.");
                return;
            }
            if (targetType === "ALL_SCHOOLS" && (!selectedRegionId || !selectedZoneId || !selectedWoredaId)) {
                setError("Please select Region, Zone, and Woreda.");
                return;
            }
            if (targetType === "SPECIFIC_SCHOOL" && (!selectedRegionId || !selectedZoneId || !selectedWoredaId || !selectedSchoolId)) {
                setError("Please select Region, Zone, Woreda, and target School.");
                return;
            }
        } else if (userTier === "REGION") {
            if (targetType === "SPECIFIC_ZONE" && !selectedZoneId) {
                setError("Please select a target Zone.");
                return;
            }
            if (targetType === "ALL_WOREDAS" && !selectedZoneId) {
                setError("Please select a parent Zone.");
                return;
            }
            if (targetType === "SPECIFIC_WOREDA" && (!selectedZoneId || !selectedWoredaId)) {
                setError("Please select Zone and target Woreda.");
                return;
            }
            if (targetType === "ALL_SCHOOLS" && (!selectedZoneId || !selectedWoredaId)) {
                setError("Please select Zone and Woreda.");
                return;
            }
            if (targetType === "SPECIFIC_SCHOOL" && (!selectedZoneId || !selectedWoredaId || !selectedSchoolId)) {
                setError("Please select Zone, Woreda, and target School.");
                return;
            }
        } else if (userTier === "ZONE") {
            if (targetType === "SPECIFIC_WOREDA" && !selectedWoredaId) {
                setError("Please select a target Woreda.");
                return;
            }
            if (targetType === "ALL_SCHOOLS" && !selectedWoredaId) {
                setError("Please select a parent Woreda.");
                return;
            }
            if (targetType === "SPECIFIC_SCHOOL" && (!selectedWoredaId || !selectedSchoolId)) {
                setError("Please select Woreda and target School.");
                return;
            }
        } else if (userTier === "WOREDA") {
            if (targetType === "SPECIFIC_SCHOOL" && !selectedSchoolId) {
                setError("Please select a target School.");
                return;
            }
        }

        if (!isGoogleConnected) {
            setError("Google OAuth account is not connected yet. Please click 'Connect Google Account' above to authorize live Google Forms creation.");
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        setSubmitting(true);
        try {
            setProgressStatus("Saving Data Request in EduBridge...");

            // 1. Create Data Request in EduBridge
            const createPayload = {
                title: title.trim(),
                description: description.trim() || undefined,
                objective: objective.trim(),
                priority,
                startDate,
                deadline,
                instructions: instructions.trim() || undefined,
                requiredAction: requiredAction.trim() || undefined,
                targetScope: targetType === "ALL" ? "ALL_AUTHORIZED_DESCENDANTS" : targetType,
                targetUnitIds: resolvedTargetIds.length > 0 ? resolvedTargetIds : undefined,
                fields: []
            };

            const createRes = await fetchApi("/data-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(createPayload)
            });

            if (!createRes.ok) {
                const errJson = await createRes.json();
                throw new Error(errJson.message || "Failed to create Data Request");
            }

            const createdJson = await createRes.json();
            const requestId = createdJson.data?.id;

            setProgressStatus("Connecting to Google Forms API to generate form...");

            // 2. Trigger Google Form Generation
            const googleRes = await fetchApi(`/data-requests/${requestId}/google-form`, {
                method: "POST"
            });

            if (!googleRes.ok) {
                const errJson = await googleRes.json();
                throw new Error(errJson.message || "Failed to generate Google Form");
            }

            const googleJson = await googleRes.json();
            const responderUri = googleJson.data?.responderUri || `https://docs.google.com/forms/d/e/${requestId}/viewform`;
            const formUrl = googleJson.data?.formUrl || `https://docs.google.com/forms/d/${requestId}/edit`;

            setProgressStatus("Finalizing Data Request...");

            setSuccessData({
                id: requestId,
                title: title.trim(),
                googleResponderUri: responderUri,
                googleFormEditUrl: formUrl,
                targetCount: createdJson.data?.targets?.length || resolvedTargetIds.length || 1
            });
        } catch (err: any) {
            console.error("Data Request creation failed:", err);
            setError(err.message || "Failed to create Data Request.");
        } finally {
            setSubmitting(false);
            setProgressStatus(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
    };

    // Auto-sync Google Form questions on window focus and periodic background poll
    useEffect(() => {
        if (!successData?.id) return;

        // Immediate check
        syncQuestionsFromGoogleForm(successData.id, true);

        // Auto-sync whenever administrator switches back to the EduBridge tab from Google Forms
        const handleWindowFocus = () => {
            syncQuestionsFromGoogleForm(successData.id, true);
        };
        window.addEventListener("focus", handleWindowFocus);

        // Periodic background poll every 7 seconds
        const pollInterval = setInterval(() => {
            syncQuestionsFromGoogleForm(successData.id, true);
        }, 7000);

        return () => {
            window.removeEventListener("focus", handleWindowFocus);
            clearInterval(pollInterval);
        };
    }, [successData?.id]);

    // Clean Government Success Receipt Screen
    if (successData) {
        return (
            <div className="bg-white border border-slate-200 rounded-lg p-6 md:p-8 max-w-3xl mx-auto space-y-6 text-slate-800 font-sans shadow-xs">
                <div className="pb-4 border-b border-slate-200 flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium mb-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Data request and form created successfully</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900">{successData.title}</h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Form initialized for {successData.targetCount} targeted organization unit(s).
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onCreated ? onCreated(successData.id) : onBack?.()}
                        className="px-4 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-semibold rounded cursor-pointer transition-colors shrink-0"
                    >
                        Done — View request
                    </button>
                </div>

                {/* Form Links & Access */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 border border-slate-200 rounded space-y-2 bg-slate-50">
                        <span className="text-xs font-semibold text-slate-900 block">1. Form Questions</span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Open the generated form in Google Forms to add, reorder, or adjust survey questions.
                        </p>
                        {successData.googleFormEditUrl && (
                            <a
                                href={successData.googleFormEditUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4085b3] hover:underline pt-1"
                            >
                                <span>Open in Google Forms</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        )}
                    </div>

                    <div className="p-4 border border-slate-200 rounded space-y-2 bg-slate-50">
                        <span className="text-xs font-semibold text-slate-900 block">2. Public Responder Link</span>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Official URL distributed to schools and targeted units to submit returns.
                        </p>
                        <div className="flex items-center gap-1.5 pt-1">
                            <input
                                type="text"
                                readOnly
                                value={successData.googleResponderUri}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono text-slate-700 select-all"
                            />
                            <button
                                type="button"
                                onClick={() => copyToClipboard(successData.googleResponderUri)}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-medium rounded transition-colors cursor-pointer shrink-0"
                                title="Copy link"
                            >
                                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Synced Questions Table */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                            Questions in form ({syncedQuestions.length})
                        </span>
                        <div className="flex items-center gap-2">
                            {lastSyncedTime && (
                                <span className="text-[11px] text-slate-400">
                                    Last checked {lastSyncedTime}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => syncQuestionsFromGoogleForm(successData.id, false)}
                                disabled={syncingQuestions}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium rounded cursor-pointer transition-colors"
                            >
                                <RefreshCw className={`w-3 h-3 ${syncingQuestions ? "animate-spin text-[#4085b3]" : "text-slate-500"}`} />
                                <span>{syncingQuestions ? "Checking..." : "Sync questions"}</span>
                            </button>
                        </div>
                    </div>

                    {syncedQuestions.length === 0 ? (
                        <div className="p-6 border border-dashed border-slate-300 rounded text-center text-xs text-slate-500">
                            No questions detected yet. Add questions in Google Forms and click "Sync questions" above.
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded overflow-hidden">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold text-[11px]">
                                    <tr>
                                        <th className="px-3 py-2 w-10 text-center">#</th>
                                        <th className="px-3 py-2">Question</th>
                                        <th className="px-3 py-2">Type</th>
                                        <th className="px-3 py-2">Required</th>
                                        <th className="px-3 py-2">Details / Choices</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {syncedQuestions.map((q: any, idx: number) => (
                                        <tr key={q.id || idx} className="hover:bg-slate-50">
                                            <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                            <td className="px-3 py-2 font-medium text-slate-900">{q.label}</td>
                                            <td className="px-3 py-2 text-slate-600">{q.fieldType}</td>
                                            <td className="px-3 py-2">{q.required ? <span className="font-semibold text-rose-600">Yes</span> : "Optional"}</td>
                                            <td className="px-3 py-2 text-slate-500 text-[11px] max-w-xs truncate">
                                                {q.options && q.options.length > 0 ? q.options.join(", ") : q.description || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
                    <button
                        type="button"
                        onClick={() => onCreated ? onCreated(successData.id) : onBack?.()}
                        className="px-5 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-semibold rounded cursor-pointer transition-colors"
                    >
                        Done — View request
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto py-6 px-4 font-sans text-slate-800 space-y-6">
            {/* Top Minimal Bar */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        title="Back to data requests"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-slate-900">New Data Request</h1>
                        <p className="text-xs text-slate-500">Initiate an administrative data collection request across the education hierarchy.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleCreateAndGenerateGoogleForm}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#32698e] rounded disabled:opacity-50 shadow-xs cursor-pointer transition-colors"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{progressStatus || "Creating..."}</span>
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Create & Generate Form</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Google OAuth Connection Warning (Only shown when not authorized) */}
            {!isGoogleConnected && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Google account connection is required to automatically generate linked forms in Google Drive.</span>
                    </div>
                    {googleAuthUrl && (
                        <button
                            type="button"
                            onClick={handleConnectGoogle}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-xs transition-colors cursor-pointer shrink-0"
                        >
                            Connect Google Account
                        </button>
                    )}
                </div>
            )}

            {/* Error Alert */}
            {error && (
                <div className="p-3.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Main Clean Form Card */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-xs">
                {/* 1. Target Jurisdiction & Scope */}
                <div className="space-y-3 pb-6 border-b border-slate-200">
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                            Target Audience / Scope <span className="text-rose-500">*</span>
                        </label>
                        <p className="text-xs text-slate-500 mb-2">Select which administrative level or specific institution must submit returns.</p>
                        <select
                            value={targetType}
                            onChange={(e) => {
                                const val = e.target.value as any;
                                setTargetType(val);
                                setSelectedRegionId("");
                                setSelectedZoneId("");
                                setSelectedWoredaId("");
                                setSelectedSchoolId("");
                            }}
                            className="w-full border border-slate-300 rounded p-2 text-xs bg-white focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] font-medium text-slate-800 cursor-pointer"
                        >
                            {userTier === "FEDERAL" && (
                                <>
                                    <option value="ALL">Entire Country (All Jurisdictions, Regions, Zones, Woredas, & Schools)</option>
                                    <option value="ALL_REGIONS">All Regions Nationwide (Regions Only)</option>
                                    <option value="SPECIFIC_REGION">Target Specific Region (Region Only)</option>
                                    <option value="ALL_ZONES">All Zones in a Specific Region</option>
                                    <option value="SPECIFIC_ZONE">Target Specific Zone (Zone Only)</option>
                                    <option value="ALL_WOREDAS">All Woredas in a Specific Zone</option>
                                    <option value="SPECIFIC_WOREDA">Target Specific Woreda (Woreda Only)</option>
                                    <option value="ALL_SCHOOLS">All Schools in a Specific Woreda</option>
                                    <option value="SPECIFIC_SCHOOL">Target Specific School (School Only)</option>
                                </>
                            )}
                            {userTier === "REGION" && (
                                <>
                                    <option value="ALL">Entire Region (All Zones, Woredas, & Schools)</option>
                                    <option value="ALL_ZONES">All Zones in Region (Zones Only)</option>
                                    <option value="SPECIFIC_ZONE">Target Specific Zone (Zone Only)</option>
                                    <option value="ALL_WOREDAS">All Woredas in a Specific Zone</option>
                                    <option value="SPECIFIC_WOREDA">Target Specific Woreda (Woreda Only)</option>
                                    <option value="ALL_SCHOOLS">All Schools in a Specific Woreda</option>
                                    <option value="SPECIFIC_SCHOOL">Target Specific School (School Only)</option>
                                </>
                            )}
                            {userTier === "ZONE" && (
                                <>
                                    <option value="ALL">Entire Zone (All Woredas & Schools)</option>
                                    <option value="ALL_WOREDAS">All Woredas in Zone (Woredas Only)</option>
                                    <option value="SPECIFIC_WOREDA">Target Specific Woreda (Woreda Only)</option>
                                    <option value="ALL_SCHOOLS">All Schools in a Specific Woreda</option>
                                    <option value="SPECIFIC_SCHOOL">Target Specific School (School Only)</option>
                                </>
                            )}
                            {userTier === "WOREDA" && (
                                <>
                                    <option value="ALL">Entire Woreda (All Schools)</option>
                                    <option value="SPECIFIC_SCHOOL">Target Specific School (School Only)</option>
                                </>
                            )}
                        </select>
                    </div>

                    {/* Drill-down: Specific Region (Searchable) */}
                    {targetType === "SPECIFIC_REGION" && (
                        <div className="pt-2">
                            <label className="block text-xs font-bold text-slate-800 mb-1">
                                Region <span className="text-rose-500">*</span>
                            </label>
                            <SearchableSelect
                                options={regionOptions}
                                value={selectedRegionId}
                                onChange={(val) => setSelectedRegionId(val)}
                                placeholder="Select region"
                                searchPlaceholder="Type region..."
                            />
                        </div>
                    )}

                    {/* Drill-down: All Zones in Region */}
                    {targetType === "ALL_ZONES" && (
                        <div className="pt-2">
                            <label className="block text-xs font-bold text-slate-800 mb-1">
                                Region <span className="text-rose-500">*</span>
                            </label>
                            <SearchableSelect
                                options={regionOptions}
                                value={selectedRegionId}
                                onChange={(val) => setSelectedRegionId(val)}
                                placeholder="Select region"
                                searchPlaceholder="Type region..."
                            />
                        </div>
                    )}

                    {/* Drill-down: Specific Zone */}
                    {targetType === "SPECIFIC_ZONE" && (
                        <div className={`pt-2 grid grid-cols-1 ${userTier === "FEDERAL" ? "sm:grid-cols-2" : ""} gap-2.5`}>
                            {userTier === "FEDERAL" && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                        }}
                                        placeholder="Select region"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Zone <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={zoneOptions}
                                    value={selectedZoneId}
                                    disabled={userTier === "FEDERAL" && !selectedRegionId}
                                    onChange={(val) => setSelectedZoneId(val)}
                                    placeholder="Select zone"
                                    searchPlaceholder="Type zone..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Drill-down: All Woredas in Zone */}
                    {targetType === "ALL_WOREDAS" && (
                        <div className={`pt-2 grid grid-cols-1 ${userTier === "FEDERAL" ? "sm:grid-cols-2" : ""} gap-2.5`}>
                            {userTier === "FEDERAL" && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                        }}
                                        placeholder="Select region"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Zone <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={zoneOptions}
                                    value={selectedZoneId}
                                    disabled={userTier === "FEDERAL" && !selectedRegionId}
                                    onChange={(val) => setSelectedZoneId(val)}
                                    placeholder="Select zone"
                                    searchPlaceholder="Type zone..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Drill-down: Specific Woreda */}
                    {targetType === "SPECIFIC_WOREDA" && (
                        <div className={`pt-2 grid grid-cols-1 ${userTier === "FEDERAL" ? "sm:grid-cols-3" : userTier === "REGION" ? "sm:grid-cols-2" : ""} gap-2.5`}>
                            {userTier === "FEDERAL" && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                            setSelectedWoredaId("");
                                        }}
                                        placeholder="Select region"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                            )}
                            {(userTier === "FEDERAL" || userTier === "REGION") && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        Zone <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={zoneOptions}
                                        value={selectedZoneId}
                                        disabled={userTier === "FEDERAL" && !selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedZoneId(val);
                                            setSelectedWoredaId("");
                                        }}
                                        placeholder="Select zone"
                                        searchPlaceholder="Type zone..."
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Woreda <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={woredaOptions}
                                    value={selectedWoredaId}
                                    disabled={(userTier === "FEDERAL" || userTier === "REGION") && !selectedZoneId}
                                    onChange={(val) => setSelectedWoredaId(val)}
                                    placeholder="Select woreda"
                                    searchPlaceholder="Type woreda..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Drill-down: All Schools in Woreda */}
                    {targetType === "ALL_SCHOOLS" && (
                        <div className={`pt-2 grid grid-cols-1 ${userTier === "FEDERAL" ? "sm:grid-cols-3" : userTier === "REGION" ? "sm:grid-cols-2" : ""} gap-2.5`}>
                            {userTier === "FEDERAL" && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                            setSelectedWoredaId("");
                                        }}
                                        placeholder="Select region"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                            )}
                            {(userTier === "FEDERAL" || userTier === "REGION") && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        Zone <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={zoneOptions}
                                        value={selectedZoneId}
                                        disabled={userTier === "FEDERAL" && !selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedZoneId(val);
                                            setSelectedWoredaId("");
                                        }}
                                        placeholder="Select zone"
                                        searchPlaceholder="Type zone..."
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    Woreda <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={woredaOptions}
                                    value={selectedWoredaId}
                                    disabled={(userTier === "FEDERAL" || userTier === "REGION") && !selectedZoneId}
                                    onChange={(val) => setSelectedWoredaId(val)}
                                    placeholder="Select woreda"
                                    searchPlaceholder="Type woreda..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Drill-down: Specific School (4-level Searchable Cascade) */}
                    {targetType === "SPECIFIC_SCHOOL" && (
                        <div className={`pt-2 grid grid-cols-1 ${userTier === "FEDERAL" ? "sm:grid-cols-4" : userTier === "REGION" ? "sm:grid-cols-3" : userTier === "ZONE" ? "sm:grid-cols-2" : ""} gap-2.5`}>
                            {userTier === "FEDERAL" && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                            setSelectedWoredaId("");
                                            setSelectedSchoolId("");
                                        }}
                                        placeholder="Select region"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                            )}

                            {(userTier === "FEDERAL" || userTier === "REGION") && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        Zone <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={zoneOptions}
                                        value={selectedZoneId}
                                        disabled={userTier === "FEDERAL" && !selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedZoneId(val);
                                            setSelectedWoredaId("");
                                            setSelectedSchoolId("");
                                        }}
                                        placeholder="Select zone"
                                        searchPlaceholder="Type zone..."
                                    />
                                </div>
                            )}

                            {(userTier === "FEDERAL" || userTier === "REGION" || userTier === "ZONE") && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        Woreda <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={woredaOptions}
                                        value={selectedWoredaId}
                                        disabled={(userTier === "FEDERAL" || userTier === "REGION") && !selectedZoneId}
                                        onChange={(val) => {
                                            setSelectedWoredaId(val);
                                            setSelectedSchoolId("");
                                        }}
                                        placeholder="Select woreda"
                                        searchPlaceholder="Type woreda..."
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    School <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={schoolOptions}
                                    value={selectedSchoolId}
                                    disabled={userTier !== "WOREDA" && !selectedWoredaId}
                                    onChange={(val) => setSelectedSchoolId(val)}
                                    placeholder="Select school"
                                    searchPlaceholder="Type school..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Resolved Target Scope Indicator */}
                    {resolvedTargetSummary && (
                        <div className="pt-2 text-xs text-slate-600 flex items-center justify-between border-t border-slate-100">
                            <span>Target: <strong className="text-slate-800">{resolvedTargetSummary.description}</strong></span>
                            <span className="font-semibold text-slate-900 tabular-nums">
                                {resolvedTargetSummary.count} organization unit(s)
                            </span>
                        </div>
                    )}
                </div>

                {/* 2. Request Details */}
                <div className="space-y-4 pb-6 border-b border-slate-200">
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                            Data Request Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. 2026 National School ICT & Lab Equipment Survey"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] text-slate-900"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] text-slate-800 bg-white"
                            >
                                <option value="LOW">Low</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Start Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] text-slate-800 bg-white"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Submission Deadline <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={deadline}
                                onChange={(e) => setDeadline(e.target.value)}
                                className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] text-slate-800 bg-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                            Scope and Objective <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Describe what information is being gathered and why..."
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] text-slate-900 resize-none"
                        />
                    </div>
                </div>

                {/* 3. Form & Questionnaire */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                        Form and Questionnaire
                    </label>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        An official Google Form will be automatically created in your connected Google account. You will receive an immediate link to add or reorder survey questions, and all responses submitted by schools will sync automatically into EduBridge.
                    </p>
                    <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        <span>Google Forms integration ready</span>
                    </div>
                </div>

                {/* Form Footer Actions */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={submitting}
                        className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleCreateAndGenerateGoogleForm}
                        disabled={submitting}
                        className="px-5 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-semibold rounded transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>{progressStatus || "Creating..."}</span>
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Create & Generate Form</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
