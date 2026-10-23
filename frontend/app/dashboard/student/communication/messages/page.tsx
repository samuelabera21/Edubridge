"use client";

import ActorDirectMessagingView from "@/components/communication/ActorDirectMessagingView";

export default function StudentMessagesPage() {
    return (
        <ActorDirectMessagingView
            actorRole="STUDENT"
            portalTitle="Direct Messages"
            portalDescription="Official direct communication channel with teachers, parents, and school administration."
            toggleKey="allowStudentDM"
        />
    );
}
