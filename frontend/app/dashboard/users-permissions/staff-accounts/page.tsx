"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyStaffAccountsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/users-permissions/staff");
  }, [router]);

  return null;
}
