"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    BookOpen, 
    Sparkles, 
    Save, 
    CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AcademicConfigurationPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        academicYearFormat: "Ethiopian Calendar (E.C.)",
        passingScoreThreshold: "50%",
        formativeWeight: "40%",
        summativeWeight: "60%",
        promotionPolicy: "Automatic promotion if average score >= 50% & no core subject failure"
    });

    const loadSettings = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/school-settings/settings?category=ACADEMIC");
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
                    body: JSON.stringify({ key, value, category: "ACADEMIC" })
                });
            }
            alert("Academic configuration saved successfully!");
        } catch (err: any) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    if (loading) return <LoadingState message="Loading academic rules & evaluation policy settings..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-purple-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-purple-700" />
                        SRS Domain 16.2: Academic Evaluation & Grading Policy Configuration
                    </span>
                    <p className="text-purple-800">
                        <strong>Who Uses This:</strong> School Principal & Academic Vice-Principal.
                        <br />
                        <strong>Data Source:</strong> Database table `school_setting` queried via REST API (`/api/school-settings/settings`).
                        <br />
                        <strong>SRS Purpose:</strong> Assessment weightings %, passing score thresholds, calendar format, and student promotion rules.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <BookOpen className="w-7 h-7 text-purple-600" />
                        <span>2. Academic Configuration</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Assessment weightings %, passing score thresholds, and student promotion criteria.</p>
                </div>
                <Button onClick={handleSave} isLoading={saving} leftIcon={<Save className="w-4 h-4" />} className="bg-purple-700 hover:bg-purple-800 text-white">
                    Save Academic Settings
                </Button>
            </div>

            {/* Config Form */}
            <Card className="shadow-sm border-l-4 border-l-purple-600">
                <CardHeader className="py-4 border-b border-gray-100">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-purple-600" />
                        Evaluation Weightings & Promotion Policies
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Calendar Format</label>
                            <input
                                type="text"
                                value={config.academicYearFormat}
                                onChange={(e) => setConfig({ ...config, academicYearFormat: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Passing Mark Threshold</label>
                            <input
                                type="text"
                                value={config.passingScoreThreshold}
                                onChange={(e) => setConfig({ ...config, passingScoreThreshold: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Formative Assessment Weight %</label>
                            <input
                                type="text"
                                value={config.formativeWeight}
                                onChange={(e) => setConfig({ ...config, formativeWeight: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Summative Exam Weight %</label>
                            <input
                                type="text"
                                value={config.summativeWeight}
                                onChange={(e) => setConfig({ ...config, summativeWeight: e.target.value })}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-600"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
