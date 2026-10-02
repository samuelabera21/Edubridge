"use client";

import AccountDirectory from "../../../../components/users-permissions/AccountDirectory";

export default function AdministratorsPage() {
  return (
    <AccountDirectory
      title="Administrators & Leadership"
      description="Manage administrative accounts, vice principals, and institutional leadership access within your school."
      accountType="ADMINISTRATORS"
    />
  );
}
