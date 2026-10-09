import { redirect } from "next/navigation";

export default function LegacyTeacherStaffCommunicationPage() {
    redirect("/dashboard/teacher/communication?tab=announcements");
}
