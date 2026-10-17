import { redirect } from "next/navigation";

export default function LegacyTeacherParentCommunicationPage() {
    redirect("/dashboard/teacher/communication?tab=messages");
}
