"use client";

import { Suspense } from "react";
import WoredaDashboard from "../../../components/governance/WoredaDashboard";

export default function WoredaDashboardPage() {
    return (
        <Suspense fallback={<div className="p-8 text-xs text-gray-500">Loading Woreda Dashboard...</div>}>
            <WoredaDashboard />
        </Suspense>
    );
}
