"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyStudentAccountsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/users-permissions/students");
  }, [router]);

  return null;
}
