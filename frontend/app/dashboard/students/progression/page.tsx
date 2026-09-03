"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { TrendingUp, CheckCircle, Award, AlertCircle, Play } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";

export default function StudentProgressionPage() {
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const runBatchProgression = async () => {
        try {
            setExecuting(true);
            setMessage(null);
            const res = await fetchApi("/student/progression/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceGradeId: "grade-9",
                    targetGradeId: "grade-10",
                    academicYearId: "year-2018"
                })
            });
            if (res.ok) {
                const data = await res.json();
                setMessage(data.message || "Progression batch completed successfully.");
            } else {
                setMessage("Failed to run progression batch.");
            }
        } catch (err: any) {
            console.error(err);
            setMessage(err.message || "An error occurred.");
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="space-y-6 text-black">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-[#006b3f]">
                        <TrendingUp className="w-5 h-5" />
                        <h1 className="text-xl font-bold tracking-tight text-gray-900">4. Student Progression & End-of-Year Promotion</h1>
                    </div>
                    <p className="text-xs text-gray-500">
                        Batch promote passing students to next academic grade level based on official exam pass thresholds and GPA requirements.
                    </p>
                </div>

                <Button 
                    onClick={runBatchProgression}
                    disabled={executing}
                    className="bg-[#006b3f] hover:bg-[#005230] text-white text-xs flex items-center space-x-1.5"
                >
                    <Play className="w-4 h-4" />
                    <span>{executing ? "Processing Batch..." : "Run Annual Grade Promotion"}</span>
                </Button>
            </div>

            {message && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 font-bold flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>{message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-emerald-600">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase">Promotion Rate Target</span>
                        <h3 className="text-2xl font-black text-emerald-950">94.8%</h3>
                        <p className="text-xs text-emerald-800">Students meeting pass criteria</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-600">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase">Honor Roll Eligible</span>
                        <h3 className="text-2xl font-black text-blue-950">28.4%</h3>
                        <p className="text-xs text-gray-500">GPA &gt;= 85% with distinction</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-600">
                    <CardContent className="p-4 space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase">Remedial Flagged Students</span>
                        <h3 className="text-2xl font-black text-amber-950">5.2%</h3>
                        <p className="text-xs text-amber-800">Requires supplementary exam</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="py-3 border-b border-gray-100">
                    <CardTitle className="text-sm font-bold text-gray-900 flex items-center">
                        <Award className="w-4 h-4 mr-2 text-[#006b3f]" />
                        Grade Progression Matrix & Criteria Rules
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-4 space-y-3 text-xs text-gray-700">
                    <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                        <p className="font-bold text-gray-900">Standard Grade Promotion Rule:</p>
                        <p className="text-gray-600">Overall cumulative score &gt;= 50% across all required core subjects.</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                        <p className="font-bold text-gray-900">Honor Progression Distinction:</p>
                        <p className="text-gray-600">Cumulative score &gt;= 85% with 0 unexcused disciplinary warnings.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
