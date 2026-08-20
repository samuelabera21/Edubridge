"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { GraduationCap, ArrowLeft, CheckCircle2, Award } from "lucide-react";

export default function ProfessionalDevelopmentPage() {
    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div className="flex items-center space-x-3">
                <Link href="/dashboard/teacher" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Professional Development & Certifications</h1>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">
                        Track teaching workshops, continuous learning credits, and professional certification records.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <GraduationCap className="w-5 h-5 text-blue-600" />
                            <span>Completed & Upcoming Workshops</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                            <div>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded text-[10px]">PEDAGOGY</span>
                                <h4 className="font-bold text-gray-900 text-sm mt-1">Modern STEM Classroom Teaching Strategies</h4>
                                <p className="text-[10px] text-gray-400">Issued by Ministry of Education • 15 Hours</p>
                            </div>
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-full flex items-center space-x-1">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Completed
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <Award className="w-5 h-5 text-amber-500" />
                            <span>PD Summary</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <p className="text-[10px] text-amber-700 font-bold uppercase">Total PD Hours</p>
                            <p className="text-2xl font-black text-amber-900 mt-0.5">32 Hours</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
