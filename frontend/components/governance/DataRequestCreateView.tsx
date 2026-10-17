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
    X
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

    // Dynamic Fields
    const [fields, setFields] = useState<FieldItem[]>([
        {
            id: "f-1",
            label: "Number of computers",
            fieldType: "NUMBER",
            required: true,
            description: "Total count of desktop and laptop computers in inventory",
            options: []
        },
        {
            id: "f-2",
            label: "Number of functional computers",
            fieldType: "NUMBER",
            required: true,
            description: "Computers currently powered on and usable",
            options: []
        },
        {
            id: "f-3",
            label: "Is internet available?",
            fieldType: "YES_NO",
            required: true,
            description: "Dedicated broadband, 4G, or fiber internet connection",
            options: []
        },
        {
            id: "f-4",
            label: "Comments & Infrastructure condition",
            fieldType: "LONG_TEXT",
            required: false,
            description: "Any extra remarks regarding lab facilities or power stability",
            options: []
        }
    ]);

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

    // Dynamic field manipulation
    const handleAddField = () => {
        const newField: FieldItem = {
            id: `f-${Date.now()}`,
            label: `New Question ${fields.length + 1}`,
            fieldType: "SHORT_TEXT",
            required: true,
            description: "",
            options: []
        };
        setFields((prev) => [...prev, newField]);
    };

    const handleRemoveField = (index: number) => {
        if (fields.length <= 1) {
            setError("At least one question is required for a Data Request.");
            return;
        }
        setFields((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFieldChange = (index: number, key: keyof FieldItem, value: any) => {
        setFields((prev) => {
            const copy = [...prev];
            const item = { ...copy[index]!, [key]: value };

            if (key === "rawOptionsInput" && typeof value === "string") {
                item.options = value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
            }
            copy[index] = item;
            return copy;
        });
    };

    const moveField = (index: number, direction: "up" | "down") => {
        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= fields.length) return;

        setFields((prev) => {
            const copy = [...prev];
            const temp = copy[index]!;
            copy[index] = copy[newIndex]!;
            copy[newIndex] = temp;
            return copy;
        });
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

        // Validate fields
        for (let i = 0; i < fields.length; i++) {
            if (!fields[i]!.label.trim()) {
                setError(`Question #${i + 1} is missing a label.`);
                return;
            }
            if (
                (fields[i]!.fieldType === "SINGLE_SELECT" || fields[i]!.fieldType === "MULTI_SELECT") &&
                (!fields[i]!.options || fields[i]!.options.length < 2)
            ) {
                setError(`Question #${i + 1} (${fields[i]!.label}) requires at least 2 choices (comma-separated).`);
                return;
            }
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
                fields: fields.map((f, idx) => ({
                    label: f.label.trim(),
                    fieldType: f.fieldType,
                    required: f.required,
                    description: f.description?.trim() || null,
                    options: f.options,
                    order: idx + 1
                }))
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

    // Success Screen
    if (successData) {
        return (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 max-w-2xl mx-auto text-center space-y-6 shadow-sm">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                    <h2 className="text-xl font-bold text-slate-900">Data Request & Google Form Created!</h2>
                    <p className="text-xs md:text-sm text-slate-500">
                        "{successData.title}" was published to {successData.targetCount} targeted unit(s).
                    </p>
                </div>

                {/* Live Form Link Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                            Live Google Form Submission URL
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            Active
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            readOnly
                            value={successData.googleResponderUri}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 select-all"
                        />
                        <button
                            type="button"
                            onClick={() => copyToClipboard(successData.googleResponderUri)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Copy link"
                        >
                            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <a
                            href={successData.googleResponderUri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Open Public Form</span>
                        </a>

                        {successData.googleFormEditUrl && (
                            <a
                                href={successData.googleFormEditUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Edit Form in Google Drive</span>
                            </a>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => onCreated ? onCreated(successData.id) : onBack?.()}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
                    >
                        View Request Ledger & Responses
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-16">
            {/* Top Navigation */}
            <div className="flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Data Requests</span>
                </button>
            </div>

            {/* Google OAuth Connection Status Card */}
            {!isGoogleConnected ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                            <span className="font-semibold text-amber-900">Google Account Authorization Required: </span>
                            <span className="text-amber-700">Connect your Google account to create live Google Forms.</span>
                        </div>
                    </div>
                    {googleAuthUrl && (
                        <button
                            type="button"
                            onClick={handleConnectGoogle}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm"
                        >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Connect Google Account</span>
                        </button>
                    )}
                </div>
            ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800 shadow-sm">
                    <div className="flex items-center gap-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Google Forms API Connected & Ready</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-white border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                        Authorized
                    </span>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs font-medium text-red-800 shadow-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Section 1: Target Audience */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">1. Target Audience</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Define which jurisdictions or specific organizations must submit data.</p>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                            Target Audience <span className="text-rose-500">*</span>
                        </label>
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
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white focus:ring-1 focus:ring-blue-600 font-medium text-slate-800 cursor-pointer"
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
                                1. Region <span className="text-rose-500">*</span>
                            </label>
                            <SearchableSelect
                                options={regionOptions}
                                value={selectedRegionId}
                                onChange={(val) => setSelectedRegionId(val)}
                                placeholder="-- Region --"
                                searchPlaceholder="Type region..."
                            />
                        </div>
                    )}

                    {/* Drill-down: All Zones in Region */}
                    {targetType === "ALL_ZONES" && (
                        <div className="pt-2">
                            <label className="block text-xs font-bold text-slate-800 mb-1">
                                1. Region <span className="text-rose-500">*</span>
                            </label>
                            <SearchableSelect
                                options={regionOptions}
                                value={selectedRegionId}
                                onChange={(val) => setSelectedRegionId(val)}
                                placeholder="-- Region --"
                                searchPlaceholder="Type region..."
                            />
                        </div>
                    )}

                    {/* Drill-down: Specific Zone (Searchable Region -> Zone) */}
                    {targetType === "SPECIFIC_ZONE" && (
                        <div className={`pt-2 grid grid-cols-1 ${userTier === "FEDERAL" ? "sm:grid-cols-2" : ""} gap-2.5`}>
                            {userTier === "FEDERAL" && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        1. Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                        }}
                                        placeholder="-- Region --"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    {userTier === "FEDERAL" ? "2. Zone" : "1. Zone"} <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={zoneOptions}
                                    value={selectedZoneId}
                                    disabled={userTier === "FEDERAL" && !selectedRegionId}
                                    onChange={(val) => setSelectedZoneId(val)}
                                    placeholder="-- Zone --"
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
                                        1. Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                        }}
                                        placeholder="-- Region --"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    {userTier === "FEDERAL" ? "2. Zone" : "1. Zone"} <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={zoneOptions}
                                    value={selectedZoneId}
                                    disabled={userTier === "FEDERAL" && !selectedRegionId}
                                    onChange={(val) => setSelectedZoneId(val)}
                                    placeholder="-- Zone --"
                                    searchPlaceholder="Type zone..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Drill-down: Specific Woreda (Searchable Region -> Zone -> Woreda) */}
                    {targetType === "SPECIFIC_WOREDA" && (
                        <div className={`pt-2 grid grid-cols-1 ${userTier === "FEDERAL" ? "sm:grid-cols-3" : userTier === "REGION" ? "sm:grid-cols-2" : ""} gap-2.5`}>
                            {userTier === "FEDERAL" && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        1. Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                            setSelectedWoredaId("");
                                        }}
                                        placeholder="-- Region --"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                            )}
                            {(userTier === "FEDERAL" || userTier === "REGION") && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        {userTier === "FEDERAL" ? "2. Zone" : "1. Zone"} <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={zoneOptions}
                                        value={selectedZoneId}
                                        disabled={userTier === "FEDERAL" && !selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedZoneId(val);
                                            setSelectedWoredaId("");
                                        }}
                                        placeholder="-- Zone --"
                                        searchPlaceholder="Type zone..."
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    {userTier === "FEDERAL" ? "3. Woreda" : userTier === "REGION" ? "2. Woreda" : "1. Woreda"} <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={woredaOptions}
                                    value={selectedWoredaId}
                                    disabled={(userTier === "FEDERAL" || userTier === "REGION") && !selectedZoneId}
                                    onChange={(val) => setSelectedWoredaId(val)}
                                    placeholder="-- Woreda --"
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
                                        1. Region <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={regionOptions}
                                        value={selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedRegionId(val);
                                            setSelectedZoneId("");
                                            setSelectedWoredaId("");
                                        }}
                                        placeholder="-- Region --"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                            )}
                            {(userTier === "FEDERAL" || userTier === "REGION") && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        {userTier === "FEDERAL" ? "2. Zone" : "1. Zone"} <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={zoneOptions}
                                        value={selectedZoneId}
                                        disabled={userTier === "FEDERAL" && !selectedRegionId}
                                        onChange={(val) => {
                                            setSelectedZoneId(val);
                                            setSelectedWoredaId("");
                                        }}
                                        placeholder="-- Zone --"
                                        searchPlaceholder="Type zone..."
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    {userTier === "FEDERAL" ? "3. Woreda" : userTier === "REGION" ? "2. Woreda" : "1. Woreda"} <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={woredaOptions}
                                    value={selectedWoredaId}
                                    disabled={(userTier === "FEDERAL" || userTier === "REGION") && !selectedZoneId}
                                    onChange={(val) => setSelectedWoredaId(val)}
                                    placeholder="-- Woreda --"
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
                                        1. Region <span className="text-rose-500">*</span>
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
                                        placeholder="-- Region --"
                                        searchPlaceholder="Type region..."
                                    />
                                </div>
                            )}

                            {(userTier === "FEDERAL" || userTier === "REGION") && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        {userTier === "FEDERAL" ? "2. Zone" : "1. Zone"} <span className="text-rose-500">*</span>
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
                                        placeholder="-- Zone --"
                                        searchPlaceholder="Type zone..."
                                    />
                                </div>
                            )}

                            {(userTier === "FEDERAL" || userTier === "REGION" || userTier === "ZONE") && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-800 mb-1">
                                        {userTier === "FEDERAL" ? "3. Woreda" : userTier === "REGION" ? "2. Woreda" : "1. Woreda"} <span className="text-rose-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        options={woredaOptions}
                                        value={selectedWoredaId}
                                        disabled={(userTier === "FEDERAL" || userTier === "REGION") && !selectedZoneId}
                                        onChange={(val) => {
                                            setSelectedWoredaId(val);
                                            setSelectedSchoolId("");
                                        }}
                                        placeholder="-- Woreda --"
                                        searchPlaceholder="Type woreda..."
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-800 mb-1">
                                    {userTier === "FEDERAL" ? "4. School" : userTier === "REGION" ? "3. School" : userTier === "ZONE" ? "2. School" : "1. School"} <span className="text-rose-500">*</span>
                                </label>
                                <SearchableSelect
                                    options={schoolOptions}
                                    value={selectedSchoolId}
                                    disabled={userTier !== "WOREDA" && !selectedWoredaId}
                                    onChange={(val) => setSelectedSchoolId(val)}
                                    placeholder="-- School --"
                                    searchPlaceholder="Type school..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Resolved Target Summary Banner */}
                    {resolvedTargetSummary && (
                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900 mt-2">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                <span>{resolvedTargetSummary.description}</span>
                            </div>
                            <span className="font-bold bg-white px-2.5 py-0.5 rounded-md border border-blue-200 text-blue-700 shadow-2xs">
                                {resolvedTargetSummary.count} target unit(s)
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 2: Basic Information */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100">
                    <h2 className="text-base font-bold text-slate-900">2. Data Request Details</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Define the title, purpose, priority, and timeline for this request.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                            Data Request Title <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. 2026 National School ICT & Lab Equipment Survey"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none font-medium text-slate-800"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as any)}
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 font-medium text-slate-800"
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
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 font-medium text-slate-800"
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
                                className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 font-medium text-slate-800"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                            Objective & Scope Description <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Describe what information is being gathered and why (e.g. Assessment for nationwide high school computer lab modernization)..."
                            value={objective}
                            onChange={(e) => setObjective(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none font-medium text-slate-800 resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Section 3: Dynamic Questions Builder */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">3. Form Questions Schema ({fields.length})</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Build questions for your Google Form. Questions map directly into the live form.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleAddField}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Question</span>
                    </button>
                </div>

                <div className="space-y-3">
                    {fields.map((f, index) => (
                        <div
                            key={f.id}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800">
                                    Question #{index + 1}
                                </span>

                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        disabled={index === 0}
                                        onClick={() => moveField(index, "up")}
                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                        title="Move up"
                                    >
                                        <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={index === fields.length - 1}
                                        onClick={() => moveField(index, "down")}
                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                        title="Move down"
                                    >
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveField(index)}
                                        className="p-1 text-red-500 hover:text-red-700 ml-1"
                                        title="Delete Question"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Question Title *</label>
                                    <input
                                        type="text"
                                        value={f.label}
                                        onChange={(e) => handleFieldChange(index, "label", e.target.value)}
                                        placeholder="e.g. Total student computer ratio"
                                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Question Type</label>
                                    <select
                                        value={f.fieldType}
                                        onChange={(e) => handleFieldChange(index, "fieldType", e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                                    >
                                        <option value="SHORT_TEXT">Short Text</option>
                                        <option value="LONG_TEXT">Paragraph / Long Text</option>
                                        <option value="NUMBER">Number</option>
                                        <option value="YES_NO">Yes / No</option>
                                        <option value="DATE">Date</option>
                                        <option value="SINGLE_SELECT">Multiple Choice (Single)</option>
                                        <option value="MULTI_SELECT">Checkboxes (Multiple)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hint / Description (Optional)</label>
                                <input
                                    type="text"
                                    value={f.description}
                                    onChange={(e) => handleFieldChange(index, "description", e.target.value)}
                                    placeholder="e.g. Specify count of working devices as of this week"
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                                />
                            </div>

                            {(f.fieldType === "SINGLE_SELECT" || f.fieldType === "MULTI_SELECT") && (
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        Options (comma separated) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={f.rawOptionsInput ?? f.options.join(", ")}
                                        onChange={(e) => handleFieldChange(index, "rawOptionsInput", e.target.value)}
                                        placeholder="Good, Fair, Poor, Critical"
                                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-blue-500"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id={`req-${f.id}`}
                                    checked={f.required}
                                    onChange={(e) => handleFieldChange(index, "required", e.target.checked)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                />
                                <label htmlFor={`req-${f.id}`} className="text-xs text-slate-700 font-medium cursor-pointer">
                                    Required question
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Submission Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={submitting}
                    className="px-5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onClick={handleCreateAndGenerateGoogleForm}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs md:text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{progressStatus || "Creating..."}</span>
                        </>
                    ) : (
                        <>
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Create & Generate Google Form</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
