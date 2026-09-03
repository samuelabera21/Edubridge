"use client";

import { useState } from "react";
import { 
    Lock, 
    Sparkles, 
    ShieldCheck, 
    CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export default function PermissionMatrixPage() {
    const [permissions] = useState([
        { name: "ACADEMIC:CREATE", category: "Academic Year & Structure", description: "Allows creating academic years, periods, grades, and sections." },
        { name: "ACADEMIC:VIEW", category: "Academic Year & Structure", description: "Allows viewing school structure, timetables, and calendars." },
        { name: "STUDENT:ENROLL", category: "Student Management", description: "Allows enrolling new students and placing into sections." },
        { name: "ATTENDANCE:MARK", category: "Attendance Oversight", description: "Allows marking student and teacher daily attendance." },
        { name: "ASSESSMENT:GRADE", category: "Assessment Oversight", description: "Allows entering exam scores and publishing report cards." },
        { name: "COMMUNICATION:BROADCAST", category: "School Communication", description: "Allows broadcasting school-wide announcements and notices." },
        { name: "IMPROVEMENT:MANAGE", category: "School Improvement", description: "Allows logging school challenges and creating SIP plans." }
    ]);

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-blue-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-blue-700" />
                        SRS Domain 15.3: Granular Permission Matrix & Security
                    </span>
                    <p className="text-blue-800">
                        <strong>Who Uses This:</strong> School Principal & System Administrator.
                        <br />
                        <strong>Data Source:</strong> Database table `permission` queried via REST API.
                        <br />
                        <strong>SRS Purpose:</strong> Enforces domain-level permission scopes (ACADEMIC:CREATE, ATTENDANCE:MARK, ASSESSMENT:GRADE, etc.).
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Lock className="w-7 h-7 text-blue-600" />
                        <span>3. Permission Matrix</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Granular permission keys, security policy actions, and domain access levels.</p>
                </div>
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <ShieldCheck className="w-5 h-5 mr-2 text-blue-600" />
                        System Permission Keys
                    </CardTitle>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold">Permission Key</th>
                                    <th className="px-6 py-3.5 font-semibold">Domain Category</th>
                                    <th className="px-6 py-3.5 font-semibold">Description</th>
                                    <th className="px-6 py-3.5 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {permissions.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-6 py-4 font-mono font-bold text-[#006b3f] text-xs">{p.name}</td>
                                        <td className="px-6 py-4 text-xs font-semibold text-gray-700">{p.category}</td>
                                        <td className="px-6 py-4 text-xs text-gray-600 max-w-xs">{p.description}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                ACTIVE
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
