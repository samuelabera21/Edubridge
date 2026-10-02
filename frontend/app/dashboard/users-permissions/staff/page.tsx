"use client";

import AccountDirectory from "../../../../components/users-permissions/AccountDirectory";

export default function StaffPage() {
  return (
    <AccountDirectory
      title="Support Staff"
      description="Manage institutional support staff accounts and non-instructional school access."
      accountType="SUPPORT_STAFF"
    />
  );
}
