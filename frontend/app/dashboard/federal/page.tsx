"use client";

import TierGovernanceDashboard from "../../../components/governance/TierGovernanceDashboard";

export default function FederalDashboardPage() {
    return <TierGovernanceDashboard tier="FEDERAL" apiEndpoint="/governance/federal/dashboard" />;
}
