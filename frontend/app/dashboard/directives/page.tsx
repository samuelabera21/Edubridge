"use client";

import DirectivesRecipientView from "../../../components/governance/DirectivesRecipientView";
import { useAuth } from "../../../hooks/useAuth";

export default function DirectivesPage() {
    const { authData } = useAuth();

    const activeScope = authData?.access?.[0]?.scope;
    const unitName = activeScope?.name || "Institution";
    const unitType = (activeScope?.type || "SCHOOL") as any;

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <DirectivesRecipientView
                tierName={unitName}
                tierType={unitType}
            />
        </div>
    );
}
