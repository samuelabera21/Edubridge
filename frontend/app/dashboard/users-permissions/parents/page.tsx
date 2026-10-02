"use client";

import AccountDirectory from "../../../../components/users-permissions/AccountDirectory";

export default function ParentsPage() {
  return (
    <AccountDirectory
      title="Parents & Guardians"
      description="Manage parent portal login accounts, credentials, and access statuses."
      accountType="PARENT"
    />
  );
}
