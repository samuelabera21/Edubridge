"use client";

import ActorDirectMessagingView from "@/components/communication/ActorDirectMessagingView";

export default function ParentMessagesPage() {
    return (
        <ActorDirectMessagingView
            actorRole="PARENT"
            portalTitle="Direct Messages"
            portalDescription="Official direct communication channel with school administration, teachers, and student oversight."
            toggleKey="allowParentDM"
        />
    );
}
