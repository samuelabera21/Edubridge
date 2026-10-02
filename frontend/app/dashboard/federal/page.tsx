"use client";

import { Suspense } from "react";
import FederalDashboard from "../../../components/governance/FederalDashboard";

export default function FederalDashboardPage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-gray-500">Loading Federal Dashboard...</div>}>
            <FederalDashboard />
        </Suspense>
    );
}
