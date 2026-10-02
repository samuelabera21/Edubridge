"use client";

import AccountDirectory from "../../../../components/users-permissions/AccountDirectory";

export default function StudentsPage() {
  return (
    <AccountDirectory
      title="Students"
      description="Manage student login credentials, account activations, and temporary password resets."
      accountType="STUDENT"
    />
  );
}
