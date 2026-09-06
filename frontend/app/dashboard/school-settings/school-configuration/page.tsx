"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Settings, 
    Sparkles, 
    Building, 
    Save, 
    CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function SchoolConfigurationPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        schoolName: "Addis Ababa General Secondary & Preparatory School",
        schoolCode: "AA-SCH-2018",
        operatingHours: "08:00 AM - 04:30 PM",
        languagePreference: "Amharic / English Dual Track",
        gradingScale: "Ministry Standard (A, B, C, D, F)"
    });

    const loadSettings = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/school-settings/settings?category=SCHOOL");
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    const loaded: any = { ...config };
                    data.forEach((item: any) => {
                        if (item.key in loaded) loaded[item.key] = item.value;
                    });
                    setConfig(loaded);
                }
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            for (const [key, value] of Object.entries(config)) {
                await fetchApi("/school-settings/settings", {
                    method: "POST",
                    body: JSON.stringify({ key, value, category: "SCHOOL" })
                });
            }
            alert("School configuration saved successfully!");
        } catch (err: any) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    if (loading) return <LoadingState message="Loading institutional configuration settings from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 16.1: General Institutional School Configuration
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Uses This:</strong> School Principal & System Administrator.
                        <br />
                        <strong>Data Source:</strong> Database table `school_setting` queried via REST API (`/api/school-settings/settings`).
                        <br />
                        <strong>SRS Purpose:</strong> General school metadata, operating schedule, language dual-track settings, and grading standards.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Settings className="w-7 h-7 text-[#006b3f]" />
                        <span>1. School Configuration</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">General institutional profile settings, working hours, and grading scale parameters.</p>
                </div>
                <Button onClick={handleSave} isLoading={saving} leftIcon={<Save className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Save Configuration
                </Button>
            </div>

            {/* Config Form */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Building className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Institutional Identity & Operations
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Official School Name</label>
                            <input
                                type="text"
                                value={config.schoolName}
                                onChange={(e) => setConfig({ ...config, schoolName: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Ministry School Code</label>
                            <input
                                type="text"
                                value={config.schoolCode}
                                onChange={(e) => setConfig({ ...config, schoolCode: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Operating Hours</label>
                            <input
                                type="text"
                                value={config.operatingHours}
                                onChange={(e) => setConfig({ ...config, operatingHours: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Language Track</label>
                            <input
                                type="text"
                                value={config.languagePreference}
                                onChange={(e) => setConfig({ ...config, languagePreference: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
