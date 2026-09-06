"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Bell, 
    Sparkles, 
    Save, 
    CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function NotificationSettingsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        smsGatewayProvider: "Ethio Telecom SMS Gateway API",
        autoParentAbsenceSMS: "ENABLED",
        autoGradePublishAlert: "ENABLED",
        emergencyBroadcastChannel: "SMS + Mobile Push Notification"
    });

    const loadSettings = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/school-settings/settings?category=NOTIFICATION");
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
                    body: JSON.stringify({ key, value, category: "NOTIFICATION" })
                });
            }
            alert("Notification settings saved successfully!");
        } catch (err: any) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    if (loading) return <LoadingState message="Loading notification gateway & alert preferences..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-amber-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-amber-700" />
                        SRS Domain 16.3: Automated Notification & Gateway Settings
                    </span>
                    <p className="text-amber-800">
                        <strong>Who Uses This:</strong> School Principal & IT Systems Administrator.
                        <br />
                        <strong>Data Source:</strong> Database table `school_setting` queried via REST API (`/api/school-settings/settings`).
                        <br />
                        <strong>SRS Purpose:</strong> SMS gateway provider configuration, automated absence parent alerts, and broadcast channels.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Bell className="w-7 h-7 text-amber-600" />
                        <span>3. Notification Settings</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">SMS gateway settings, parent alert triggers, and emergency notification channels.</p>
                </div>
                <Button onClick={handleSave} isLoading={saving} leftIcon={<Save className="w-4 h-4" />} className="bg-amber-600 hover:bg-amber-700 text-white">
                    Save Notification Rules
                </Button>
            </div>

            {/* Config Form */}
            <Card className="shadow-sm border-l-4 border-l-amber-600">
                <CardHeader className="py-4 border-b border-gray-100">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Bell className="w-5 h-5 mr-2 text-amber-600" />
                        Gateways & Parent Alert Triggers
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">SMS Gateway Integration</label>
                            <input
                                type="text"
                                value={config.smsGatewayProvider}
                                onChange={(e) => setConfig({ ...config, smsGatewayProvider: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Automated Absence SMS Trigger</label>
                            <input
                                type="text"
                                value={config.autoParentAbsenceSMS}
                                onChange={(e) => setConfig({ ...config, autoParentAbsenceSMS: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Grade Report Publish Alert</label>
                            <input
                                type="text"
                                value={config.autoGradePublishAlert}
                                onChange={(e) => setConfig({ ...config, autoGradePublishAlert: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Emergency Broadcast Mode</label>
                            <input
                                type="text"
                                value={config.emergencyBroadcastChannel}
                                onChange={(e) => setConfig({ ...config, emergencyBroadcastChannel: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-amber-600"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
