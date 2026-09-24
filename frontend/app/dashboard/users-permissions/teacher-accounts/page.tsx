"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyTeacherAccountsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/users-permissions/teachers");
  }, [router]);

  return null;
}
