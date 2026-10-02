"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyPermissionsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/users-permissions/roles");
  }, [router]);

  return null;
}
