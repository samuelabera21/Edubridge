"use client";

import TierGovernanceDashboard from "../../../components/governance/TierGovernanceDashboard";

export default function RegionDashboardPage() {
    return <TierGovernanceDashboard tier="REGION" apiEndpoint="/governance/region/dashboard" />;
}
