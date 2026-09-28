"use client";

import TierGovernanceDashboard from "../../../components/governance/TierGovernanceDashboard";

export default function ZoneDashboardPage() {
    return <TierGovernanceDashboard tier="ZONE" apiEndpoint="/governance/zone/dashboard" />;
}
