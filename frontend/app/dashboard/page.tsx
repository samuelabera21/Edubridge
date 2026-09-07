import { redirect } from "next/navigation";

/**
 * The canonical School Admin Dashboard lives at /dashboard/admin.
 * Redirect any direct hits to /dashboard to the proper admin page.
 */
export default function DashboardRootPage() {
    redirect("/dashboard/admin");
}
