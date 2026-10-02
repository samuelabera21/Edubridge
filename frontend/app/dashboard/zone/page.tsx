"use client";

import { Suspense } from "react";
import ZoneDashboard from "../../../components/governance/ZoneDashboard";

export default function ZoneDashboardPage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-gray-500">Loading Zonal Dashboard...</div>}>
            <ZoneDashboard />
        </Suspense>
    );
}
