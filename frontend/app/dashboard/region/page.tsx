"use client";

import { Suspense } from "react";
import RegionalDashboard from "../../../components/governance/RegionalDashboard";

export default function RegionDashboardPage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-gray-500">Loading Regional Dashboard...</div>}>
            <RegionalDashboard />
        </Suspense>
    );
}
