"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyParentAccountsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/users-permissions/parents");
  }, [router]);

  return null;
}
