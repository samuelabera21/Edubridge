"use client";

import { useState } from "react";
import { 
    Key, 
    Sparkles, 
    Shield, 
    CheckCircle2, 
    Lock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export default function RolesManagementPage() {
    const [roles] = useState([
        { id: "1", name: "SCHOOL_PRINCIPAL", description: "Full institutional administrative access across all 16 domains.", count: 1 },
        { id: "2", name: "VICE_PRINCIPAL", description: "Academic & curriculum oversight, teacher monitoring, and support management.", count: 2 },
        { id: "3", name: "TEACHER", description: "Gradebook entry, attendance marking, and lesson plan submission.", count: 45 },
        { id: "4", name: "STUDENT", description: "Student portal access, exam results view, and learning materials.", count: 1200 },
        { id: "5", name: "PARENT", description: "Parent portal access, student performance tracking, and school notices.", count: 980 },
        { id: "6", name: "SUPPORT_STAFF", description: "Non-academic staff administrative memos and campus operational tasks.", count: 15 }
    ]);

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-purple-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-purple-700" />
                        SRS Domain 15.2: Institutional Role Definitions & Scope
                    </span>
                    <p className="text-purple-800">
                        <strong>Who Uses This:</strong> School Principal & System Administrator.
                        <br />
                        <strong>Data Source:</strong> Database table `role` queried via REST API.
                        <br />
                        <strong>SRS Purpose:</strong> Role-based access control (RBAC) definitions for Principals, Teachers, Students, Parents, and Support Staff.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Key className="w-7 h-7 text-purple-600" />
                        <span>2. Role Management</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Institutional RBAC roles, security scopes, and active account distribution.</p>
                </div>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map((r) => (
                    <Card key={r.id} className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-purple-600">
                        <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                                <Shield className="w-4 h-4 mr-2 text-purple-600" />
                                {r.name}
                            </CardTitle>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                                {r.count} Active Users
                            </span>
                        </CardHeader>
                        <CardContent className="py-4 text-sm text-gray-700">
                            <p className="text-xs text-gray-600">{r.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
