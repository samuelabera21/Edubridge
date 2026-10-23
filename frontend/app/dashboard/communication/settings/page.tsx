"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { ShieldCheck, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

interface MessagingSettings {
    allowTeacherDM: boolean;
    allowStudentDM: boolean;
    allowParentDM: boolean;
}

export default function CommunicationSettingsPage() {
    const [settings, setSettings] = useState<MessagingSettings>({
        allowTeacherDM: true,
        allowStudentDM: false,
        allowParentDM: false,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedNotice, setSavedNotice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetchApi("/communication/messaging-settings");
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to load messaging settings");
            }
            const data = await res.json();
            setSettings({
                allowTeacherDM: Boolean(data.allowTeacherDM),
                allowStudentDM: Boolean(data.allowStudentDM),
                allowParentDM: Boolean(data.allowParentDM),
            });
        } catch (err: any) {
            setError(err.message || "Failed to load messaging settings");
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (key: keyof MessagingSettings) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSavedNotice(null);
        try {
            const res = await fetchApi("/communication/messaging-settings", {
                method: "PUT",
                body: JSON.stringify(settings)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to save messaging settings");
            }
            const updated = await res.json();
            setSettings({
                allowTeacherDM: Boolean(updated.allowTeacherDM),
                allowStudentDM: Boolean(updated.allowStudentDM),
                allowParentDM: Boolean(updated.allowParentDM),
            });
            setSavedNotice("Permissions saved successfully");
            setTimeout(() => setSavedNotice(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingState message="Loading permissions..." />;

    return (
        <div className="max-w-3xl mx-auto space-y-5 text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-900 leading-tight">Messaging Permissions</h1>
                        <p className="text-[11px] text-slate-400">Manage direct messaging access for school community members.</p>
                    </div>
                </div>

                <Button
                    onClick={handleSave}
                    isLoading={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 font-semibold shadow-2xs"
                >
                    Save Changes
                </Button>
            </div>

            {/* Notification alert banner */}
            {savedNotice && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2 animate-in fade-in">
                    <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{savedNotice}</span>
                </div>
            )}

            {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Clean Enterprise Settings Container */}
            <div className="border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 shadow-2xs overflow-hidden">
                {/* 1. Teacher Toggle */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div>
                        <h3 className="text-xs font-semibold text-slate-900">Faculty & Teachers</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Allow teachers to direct message school administration</p>
                    </div>

                    <button
                        type="button"
                        role="switch"
                        aria-checked={settings.allowTeacherDM}
                        onClick={() => handleToggle("allowTeacherDM")}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            settings.allowTeacherDM ? "bg-blue-600" : "bg-slate-200"
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                settings.allowTeacherDM ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* 2. Student Toggle */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div>
                        <h3 className="text-xs font-semibold text-slate-900">Enrolled Students</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Allow enrolled students to direct message school administration</p>
                    </div>

                    <button
                        type="button"
                        role="switch"
                        aria-checked={settings.allowStudentDM}
                        onClick={() => handleToggle("allowStudentDM")}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            settings.allowStudentDM ? "bg-blue-600" : "bg-slate-200"
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                settings.allowStudentDM ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>

                {/* 3. Parent / Guardian Toggle */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div>
                        <h3 className="text-xs font-semibold text-slate-900">Parents & Guardians</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Allow verified parents to direct message school administration</p>
                    </div>

                    <button
                        type="button"
                        role="switch"
                        aria-checked={settings.allowParentDM}
                        onClick={() => handleToggle("allowParentDM")}
                        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            settings.allowParentDM ? "bg-blue-600" : "bg-slate-200"
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                settings.allowParentDM ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
}
