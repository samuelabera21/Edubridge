import { redirect } from "next/navigation";

export default function AcademicOverviewPage() {
    // For now, simply redirect the overview to the Academic Years page
    // Later we can build a dashboard with stats and graphs for the academic structure
    redirect("/dashboard/academic/years");
}
