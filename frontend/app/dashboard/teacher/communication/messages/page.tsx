"use client";

import ActorDirectMessagingView from "@/components/communication/ActorDirectMessagingView";

export default function TeacherMessagesPage() {
    return (
        <ActorDirectMessagingView
            actorRole="TEACHER"
            portalTitle="Direct Messages"
            portalDescription="Official direct communication channel with students, parents, and school administration."
            toggleKey="allowTeacherDM"
        />
    );
}
