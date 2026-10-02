"use client";

import AccountDirectory from "../../../components/users-permissions/AccountDirectory";

export default function AllAccountsPage() {
  return (
    <AccountDirectory
      title="All Accounts"
      description="Comprehensive school directory of all active and deactivated user accounts across all roles."
      accountType="ALL"
    />
  );
}
