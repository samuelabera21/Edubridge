"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Construction } from "lucide-react";
import Link from "next/link";

export default function FeaturePlaceholder() {
    const params = useParams();
    const router = useRouter();
    const featureName = typeof params.feature === "string" 
        ? params.feature.charAt(0).toUpperCase() + params.feature.slice(1) 
        : "Module";

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 pt-10">
            <button 
                onClick={() => router.back()}
                className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-12 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Construction className="w-10 h-10 text-blue-600" />
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {featureName} Management
                </h1>
                
                <p className="text-gray-600 max-w-lg mx-auto mb-8 text-lg">
                    This detailed drill-down (School → Grade → Section → Subject → Student) for <span className="font-semibold text-gray-900">{featureName}</span> will be fully implemented in the upcoming project steps.
                </p>

                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl inline-block text-left">
                    <h3 className="font-bold text-sm mb-2 uppercase tracking-wide text-amber-900">Next Implementation Steps</h3>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Step 2: Academic Organization (Grades, Sections, Subjects)</li>
                        <li>Step 3: Teaching Monitoring</li>
                        <li>Step 4: Attendance Monitoring</li>
                        <li>Step 5: Assessment & Performance</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
