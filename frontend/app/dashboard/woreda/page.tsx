"use client";

import TierGovernanceDashboard from "../../../components/governance/TierGovernanceDashboard";

export default function WoredaDashboardPage() {
    return <TierGovernanceDashboard tier="WOREDA" apiEndpoint="/governance/woreda/dashboard" />;
}
