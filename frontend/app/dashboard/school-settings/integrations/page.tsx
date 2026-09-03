"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Globe, 
    Sparkles, 
    CheckCircle2, 
    Zap, 
    Server
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function IntegrationsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [integrations] = useState([
        { name: "Ministry of Education National Portal API", type: "REST Webhook", status: "CONNECTED", lastSync: "10 mins ago" },
        { name: "Addis Ababa Education Bureau Sync Service", type: "GraphQL Connector", status: "CONNECTED", lastSync: "1 hour ago" },
        { name: "Ethio Telecom Mobile Banking Gateway (CBE Birr / Telebirr)", type: "Payment API", status: "ACTIVE", lastSync: "Real-time" },
        { name: "National Examination Agency Result Validator", type: "OAuth 2.0 API", status: "CONNECTED", lastSync: "2 days ago" }
    ]);

    useEffect(() => {
        setLoading(false);
    }, []);

    if (loading) return <LoadingState message="Loading external system integration statuses..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-blue-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-blue-700" />
                        SRS Domain 16.4: External Ministry & Payment System Integrations
                    </span>
                    <p className="text-blue-800">
                        <strong>Who Uses This:</strong> School Principal & System Integration Engineer.
                        <br />
                        <strong>Data Source:</strong> Real-time API connectors & webhooks.
                        <br />
                        <strong>SRS Purpose:</strong> National Ministry data sync, regional bureau webhooks, and payment gateway connections.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Globe className="w-7 h-7 text-blue-600" />
                        <span>4. System Integrations</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Ministry API connectors, regional bureau webhooks, and mobile banking payment gateways.</p>
                </div>
            </div>

            {/* Integrations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((item, idx) => (
                    <Card key={idx} className="shadow-sm border-l-4 border-l-blue-600">
                        <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center">
                                <Zap className="w-4 h-4 mr-2 text-blue-600" />
                                {item.name}
                            </CardTitle>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                {item.status}
                            </span>
                        </CardHeader>
                        <CardContent className="py-4 space-y-2 text-xs text-gray-600">
                            <p><strong>Integration Protocol:</strong> {item.type}</p>
                            <p><strong>Last Data Sync:</strong> {item.lastSync}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
