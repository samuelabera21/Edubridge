"use client";

import AccountDirectory from "../../../../components/users-permissions/AccountDirectory";

export default function TeachersPage() {
  return (
    <AccountDirectory
      title="Teachers"
      description="Manage faculty login accounts, provision access for existing teachers, and reset teaching credentials."
      accountType="TEACHER"
    />
  );
}
