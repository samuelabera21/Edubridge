"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacySchoolUsersRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/users-permissions");
  }, [router]);

  return null;
}
