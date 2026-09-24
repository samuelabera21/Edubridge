"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Users, UserPlus, Search, Key, CheckCircle, 
  RefreshCw, Copy, Check, Power, X,
  ChevronLeft, ChevronRight, AlertCircle, Eye, ShieldCheck, Phone
} from "lucide-react";
import { fetchApi } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  requiresPasswordChange: boolean;
  createdAt: string;
  roles: string[];
  primaryRole: string;
  accountType: string;
  scopeName: string;
  entityInfo?: {
    type: "TEACHER" | "STUDENT" | "PARENT";
    id: string;
    identifier?: string;
    jobTitle?: string;
    qualification?: string;
    employmentStatus?: string;
    gradeName?: string;
    sectionName?: string;
    enrollmentStatus?: string;
    phoneNumber?: string;
    linkedStudentsCount?: number;
    children?: Array<{
      id: string;
      student: {
        firstName: string;
        lastName: string;
        studentId: string;
      };
    }>;
  } | null;
}

export interface UnlinkedEntity {
  id: string;
  name: string;
  identifier?: string;
  grade?: string;
  section?: string;
}

export interface AccountDirectoryProps {
  title: string;
  description: string;
  accountType: "ALL" | "ADMINISTRATORS" | "TEACHER" | "STUDENT" | "PARENT" | "SUPPORT_STAFF";
  defaultRoleFilter?: string;
}

export default function AccountDirectory({
  title,
  description,
  accountType,
  defaultRoleFilter = "ALL"
}: AccountDirectoryProps) {
  const { authData } = useAuth();
  const currentUserId = authData?.user?.id;

  // State
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<{ total: number; active: number; deactivated: number }>({
    total: 0,
    active: 0,
    deactivated: 0
  });

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DEACTIVATED">("ALL");
  const [roleFilter, setRoleFilter] = useState<string>(
    accountType !== "ALL" ? accountType : defaultRoleFilter
  );
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Unlinked entities
  const [unlinkedEntities, setUnlinkedEntities] = useState<UnlinkedEntity[]>([]);
  const [unlinkedLoading, setUnlinkedLoading] = useState<boolean>(false);

  // Modals
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [userToReset, setUserToReset] = useState<SystemUser | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [userToToggleStatus, setUserToToggleStatus] = useState<SystemUser | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<SystemUser | null>(null);

  // Generated Credentials
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; tempPass: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Simple Provision Form State
  const [provisionName, setProvisionName] = useState<string>("");
  const [provisionEmail, setProvisionEmail] = useState<string>("");
  const [provisionRole, setProvisionRole] = useState<string>(
    accountType === "TEACHER"
      ? "TEACHER"
      : accountType === "STUDENT"
      ? "STUDENT"
      : accountType === "PARENT"
      ? "PARENT"
      : accountType === "ADMINISTRATORS"
      ? "VICE_PRINCIPAL"
      : accountType === "SUPPORT_STAFF"
      ? "SCHOOL_SUPPORT_STAFF"
      : "TEACHER"
  );
  const [selectedUnlinkedId, setSelectedUnlinkedId] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Accounts
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const queryParams = new URLSearchParams();
      if (accountType !== "ALL") {
        queryParams.set("role", accountType);
      } else if (roleFilter && roleFilter !== "ALL") {
        queryParams.set("role", roleFilter);
      }

      if (statusFilter !== "ALL") {
        queryParams.set("status", statusFilter);
      }

      if (debouncedSearch.trim()) {
        queryParams.set("search", debouncedSearch.trim());
      }

      queryParams.set("page", page.toString());
      queryParams.set("pageSize", pageSize.toString());

      const res = await fetchApi(`/authorization/users?${queryParams.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to load accounts");
      }

      const data = await res.json();
      const itemsList = data.users || data.items || [];
      setUsers(itemsList);
      setTotalPages(data.totalPages || data.pagination?.totalPages || 1);
      setTotalCount(data.total || data.pagination?.total || itemsList.length);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while fetching accounts.");
    } finally {
      setLoading(false);
    }
  }, [accountType, roleFilter, statusFilter, debouncedSearch, page, pageSize]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Open simple provision modal
  const handleOpenProvisionModal = async () => {
    setProvisionName("");
    setProvisionEmail("");
    setSelectedUnlinkedId("");
    setProvisionRole(
      accountType === "TEACHER"
        ? "TEACHER"
        : accountType === "STUDENT"
        ? "STUDENT"
        : accountType === "PARENT"
        ? "PARENT"
        : accountType === "ADMINISTRATORS"
        ? "VICE_PRINCIPAL"
        : accountType === "SUPPORT_STAFF"
        ? "SCHOOL_SUPPORT_STAFF"
        : "TEACHER"
    );

    // Fetch unlinked items if applicable
    if (accountType === "TEACHER" || accountType === "STUDENT" || accountType === "PARENT") {
      try {
        setUnlinkedLoading(true);
        const res = await fetchApi("/authorization/unlinked-entities");
        if (res.ok) {
          const data = await res.json();
          if (accountType === "TEACHER") setUnlinkedEntities(data.teachers || []);
          if (accountType === "STUDENT") setUnlinkedEntities(data.students || []);
          if (accountType === "PARENT") setUnlinkedEntities(data.parents || []);
        }
      } catch (err) {
        console.error("Failed to load unlinked entities", err);
      } finally {
        setUnlinkedLoading(false);
      }
    } else {
      setUnlinkedEntities([]);
    }

    setIsProvisionModalOpen(true);
  };

  // Submit Simple Provisioning
  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: any = {
        roleName: provisionRole
      };

      if (selectedUnlinkedId) {
        if (accountType === "TEACHER" || provisionRole === "TEACHER") {
          payload.teacherEntityId = selectedUnlinkedId;
          const entity = unlinkedEntities.find(e => e.id === selectedUnlinkedId);
          payload.name = entity?.name || "Teacher";
        } else if (accountType === "STUDENT" || provisionRole === "STUDENT") {
          payload.studentEntityId = selectedUnlinkedId;
          const entity = unlinkedEntities.find(e => e.id === selectedUnlinkedId);
          payload.name = entity?.name || "Student";
        } else if (accountType === "PARENT" || provisionRole === "PARENT") {
          payload.parentEntityId = selectedUnlinkedId;
          const entity = unlinkedEntities.find(e => e.id === selectedUnlinkedId);
          payload.name = entity?.name || "Parent";
        }
      } else {
        if (!provisionName.trim()) {
          throw new Error("Full name is required.");
        }
        payload.name = provisionName.trim();
        if (provisionEmail.trim()) {
          payload.email = provisionEmail.trim();
        }
      }

      const res = await fetchApi("/authorization/create-user", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to provision user account.");
      }

      setIsProvisionModalOpen(false);
      setCreatedCredentials({
        username: data.user.email,
        tempPass: data.temporaryPassword || data.credentials?.tempPassword || "EduBridge2026!"
      });
      setSuccessMsg(`Account for ${data.user.name} created successfully.`);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || "Provisioning failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Status (Suspend / Activate)
  const handleConfirmToggleStatus = async () => {
    if (!userToToggleStatus) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const newStatus = !userToToggleStatus.isActive;
      const res = await fetchApi(`/authorization/users/${userToToggleStatus.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update account status.");
      }

      setIsStatusModalOpen(false);
      setUserToToggleStatus(null);
      setSuccessMsg(`Account access for ${userToToggleStatus.name} is now ${newStatus ? "Active" : "Suspended / Deactivated"}.`);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to toggle status.");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset Password
  const handleConfirmResetPassword = async () => {
    if (!userToReset) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetchApi(`/authorization/users/${userToReset.id}/reset-password`, {
        method: "POST"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password.");
      }

      setIsResetModalOpen(false);
      setCreatedCredentials({
        username: userToReset.email,
        tempPass: data.temporaryPassword || data.credentials?.tempPassword || "Admin@1234"
      });
      setUserToReset(null);
      setSuccessMsg(`Temporary password generated for ${userToReset.name}. Active sessions were revoked.`);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Real counts summary */}
          <div className="flex items-center gap-3 text-xs text-gray-600 bg-white border border-gray-200 px-3.5 py-1.5 rounded-lg shadow-2xs">
            <span>Total: <strong className="text-gray-900 font-semibold">{summary.total}</strong></span>
            <span className="text-gray-300">|</span>
            <span className="text-emerald-700">Active: <strong className="font-semibold">{summary.active}</strong></span>
            <span className="text-gray-300">|</span>
            <span className="text-slate-600">Suspended: <strong className="font-semibold">{summary.deactivated}</strong></span>
          </div>

          <button
            onClick={handleOpenProvisionModal}
            className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision Account</span>
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMsg && (
        <div className="flex items-center justify-between p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control Bar: Search & Status Filter */}
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              accountType === "TEACHER"
                ? "Search by teacher name, email, or employee ID..."
                : accountType === "STUDENT"
                ? "Search by student name, email, or student ID..."
                : accountType === "PARENT"
                ? "Search by guardian name or email..."
                : "Search accounts by name, email, or ID..."
            }
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-800 placeholder-gray-400"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          {/* Role Filter (Only on ALL Accounts) */}
          {accountType === "ALL" && (
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMINISTRATORS">Administrators & Leadership</option>
              <option value="TEACHER">Teachers</option>
              <option value="STUDENT">Students</option>
              <option value="PARENT">Parents & Guardians</option>
              <option value="SUPPORT_STAFF">Support Staff</option>
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DEACTIVATED">Suspended / Inactive</option>
          </select>

          <button
            onClick={() => loadUsers()}
            disabled={loading}
            title="Refresh list"
            className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Account Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <th className="py-3 px-4">
                  {accountType === "TEACHER" ? "Teacher Name" : accountType === "STUDENT" ? "Student Name" : accountType === "PARENT" ? "Guardian Name" : "Name / Account"}
                </th>
                <th className="py-3 px-4">Email / Login ID</th>
                {accountType === "TEACHER" && <th className="py-3 px-4">Employee ID</th>}
                {accountType === "STUDENT" && <th className="py-3 px-4">Student ID</th>}
                {accountType === "STUDENT" && <th className="py-3 px-4">Grade & Section</th>}
                {accountType === "PARENT" && <th className="py-3 px-4">Linked Students</th>}
                {(accountType === "ALL" || accountType === "ADMINISTRATORS" || accountType === "SUPPORT_STAFF") && (
                  <th className="py-3 px-4">Role</th>
                )}
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading accounts...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <p className="font-medium text-gray-700">No user accounts found.</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {searchQuery || statusFilter !== "ALL" || roleFilter !== "ALL"
                        ? "Try adjusting your search query or filters."
                        : "Click 'Provision Account' to create or link an account."}
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-200">
                            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 block">{user.name}</span>
                            {isSelf && (
                              <span className="text-[10px] text-blue-600 font-medium">(You)</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email / Username */}
                      <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                        {user.email}
                      </td>

                      {/* Teacher specific column */}
                      {accountType === "TEACHER" && (
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {user.entityInfo?.identifier || "—"}
                        </td>
                      )}

                      {/* Student specific columns */}
                      {accountType === "STUDENT" && (
                        <td className="py-3 px-4 text-gray-700 font-medium">
                          {user.entityInfo?.identifier || "—"}
                        </td>
                      )}
                      {accountType === "STUDENT" && (
                        <td className="py-3 px-4 text-gray-600">
                          {user.entityInfo?.gradeName ? `${user.entityInfo.gradeName} ${user.entityInfo.sectionName ? `(${user.entityInfo.sectionName})` : ""}` : "—"}
                        </td>
                      )}

                      {/* Parent specific column */}
                      {accountType === "PARENT" && (
                        <td className="py-3 px-4 text-gray-600">
                          {user.entityInfo?.linkedStudentsCount !== undefined
                            ? `${user.entityInfo.linkedStudentsCount} Student(s)`
                            : "—"}
                        </td>
                      )}

                      {/* Role column for ALL, Admins, Staff */}
                      {(accountType === "ALL" || accountType === "ADMINISTRATORS" || accountType === "SUPPORT_STAFF") && (
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                            {user.primaryRole.replace(/_/g, " ")}
                          </span>
                        </td>
                      )}

                      {/* Status badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            user.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {user.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>

                      {/* Simple Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect Detail */}
                          <button
                            onClick={() => setSelectedUserDetail(user)}
                            title="Inspect Account Details"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setUserToReset(user);
                              setIsResetModalOpen(true);
                            }}
                            title="Reset Password"
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 rounded-md border border-amber-200 transition-colors cursor-pointer"
                          >
                            <Key className="w-3 h-3" />
                            <span>Reset</span>
                          </button>

                          {/* Suspend / Activate Toggle */}
                          <button
                            onClick={() => {
                              if (isSelf) return;
                              setUserToToggleStatus(user);
                              setIsStatusModalOpen(true);
                            }}
                            disabled={isSelf}
                            title={isSelf ? "Cannot suspend your own account" : user.isActive ? "Suspend / Deactivate Account" : "Activate Account"}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border transition-colors cursor-pointer ${
                              isSelf
                                ? "text-gray-300 border-gray-200 cursor-not-allowed"
                                : user.isActive
                                ? "text-rose-700 hover:bg-rose-50 border-rose-200"
                                : "text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                            }`}
                          >
                            <Power className="w-3 h-3" />
                            <span>{user.isActive ? "Suspend" : "Activate"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50/50 border-t border-gray-200 text-xs text-gray-600">
          <div>
            Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1 border border-gray-200 rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2.5 font-medium text-gray-700">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1 border border-gray-200 rounded bg-white hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white text-gray-700 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Clean & Simple Provision Account Modal                           */}
      {/* ========================================================================= */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">Provision New Account</h3>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="p-6 space-y-3.5 text-xs">
              {/* If on a domain page with unlinked entities */}
              {unlinkedEntities.length > 0 && (
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200 space-y-1.5">
                  <label className="block font-semibold text-blue-900">
                    Option A: Link Existing {accountType === "TEACHER" ? "Teacher" : accountType === "STUDENT" ? "Student" : "Parent"}
                  </label>
                  <select
                    value={selectedUnlinkedId}
                    onChange={(e) => {
                      setSelectedUnlinkedId(e.target.value);
                      if (e.target.value) {
                        const entity = unlinkedEntities.find(item => item.id === e.target.value);
                        if (entity) {
                          setProvisionName(entity.name);
                        }
                      }
                    }}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Or enter new details manually below --</option>
                    {unlinkedEntities.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.identifier ? `(${item.identifier})` : ""} {item.grade ? `[${item.grade}]` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Role selection for ALL accounts */}
              {accountType === "ALL" && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Account Role</label>
                  <select
                    value={provisionRole}
                    onChange={(e) => setProvisionRole(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="TEACHER">Teacher</option>
                    <option value="STUDENT">Student</option>
                    <option value="PARENT">Parent</option>
                    <option value="VICE_PRINCIPAL">Vice Principal</option>
                    <option value="SCHOOL_SUPPORT_STAFF">Support Staff</option>
                    <option value="SCHOOL_ADMIN">School Administrator</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={provisionName}
                  onChange={(e) => setProvisionName(e.target.value)}
                  placeholder="e.g., Abebe Kebede"
                  required
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Email / Username <span className="text-gray-400 font-normal">(Optional - auto-generated if blank)</span>
                </label>
                <input
                  type="text"
                  value={provisionEmail}
                  onChange={(e) => setProvisionEmail(e.target.value)}
                  placeholder="e.g., student.2026@edubridge.local"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Reset Password Modal                                             */}
      {/* ========================================================================= */}
      {isResetModalOpen && userToReset && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-gray-900 text-sm">Reset Password</h3>
              </div>
              <button onClick={() => setIsResetModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-gray-600">
              <p>
                Reset password for <strong className="text-gray-900">{userToReset.name}</strong> ({userToReset.email})?
              </p>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <p className="font-semibold">What happens next:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>A temporary password will be generated.</li>
                  <li>All active login sessions for this user will be revoked immediately.</li>
                  <li>The user will be prompted to set a new password on their next login.</li>
                </ul>
              </div>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResetPassword}
                disabled={submitting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Reset Password</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Suspend / Activate Account Modal                                 */}
      {/* ========================================================================= */}
      {isStatusModalOpen && userToToggleStatus && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Power className={`w-5 h-5 ${userToToggleStatus.isActive ? "text-rose-600" : "text-emerald-600"}`} />
                <h3 className="font-bold text-gray-900 text-sm">
                  {userToToggleStatus.isActive ? "Suspend Account" : "Activate Account"}
                </h3>
              </div>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-gray-600">
              <p>
                Are you sure you want to {userToToggleStatus.isActive ? "suspend" : "activate"}{" "}
                <strong className="text-gray-900">{userToToggleStatus.name}</strong> ({userToToggleStatus.email})?
              </p>
              {userToToggleStatus.isActive ? (
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-200 text-rose-900 text-[11px]">
                  Suspending this account immediately ends their active login session and disables sign in. Domain records are preserved.
                </div>
              ) : (
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-emerald-900 text-[11px]">
                  Activating this account will restore standard login access.
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmToggleStatus}
                disabled={submitting}
                className={`px-4 py-2 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer ${
                  userToToggleStatus.isActive ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{userToToggleStatus.isActive ? "Suspend Account" : "Activate Account"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Credentials Display Modal                                        */}
      {/* ========================================================================= */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-emerald-50">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm">Temporary Credentials</h3>
              </div>
              <button onClick={() => setCreatedCredentials(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-gray-600">
                Deliver these credentials to the user. They will be required to change the password upon signing in.
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2 font-mono">
                <div>
                  <span className="text-[10px] text-gray-400 block font-sans uppercase font-bold">Username / Login ID</span>
                  <span className="text-xs font-semibold text-gray-900">{createdCredentials.username}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-sans uppercase font-bold">Temporary Password</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                    {createdCredentials.tempPass}
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  copyToClipboard(
                    `EduBridge Credentials:\nUsername: ${createdCredentials.username}\nTemporary Password: ${createdCredentials.tempPass}`
                  )
                }
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold transition-colors border border-blue-200 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
                <span>{copied ? "Copied to Clipboard!" : "Copy Credentials"}</span>
              </button>
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setCreatedCredentials(null)}
                className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg font-semibold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: Simple Account Inspection                                        */}
      {/* ========================================================================= */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">Account Overview</h3>
              </div>
              <button onClick={() => setSelectedUserDetail(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-gray-700">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                  {selectedUserDetail.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{selectedUserDetail.name}</h4>
                  <p className="text-gray-500 font-mono text-[11px]">{selectedUserDetail.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase font-semibold">Status</span>
                  <span className={`font-semibold ${selectedUserDetail.isActive ? "text-emerald-700" : "text-rose-600"}`}>
                    {selectedUserDetail.isActive ? "Active" : "Suspended"}
                  </span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase font-semibold">Role</span>
                  <span className="font-semibold text-gray-900">{selectedUserDetail.primaryRole.replace(/_/g, " ")}</span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase font-semibold">Password Reset Required</span>
                  <span className="font-semibold text-gray-900">{selectedUserDetail.requiresPasswordChange ? "Yes" : "No"}</span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase font-semibold">School Scope</span>
                  <span className="font-semibold text-gray-900">{selectedUserDetail.scopeName || "Current School"}</span>
                </div>
              </div>

              {selectedUserDetail.entityInfo && (
                <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-[11px] space-y-0.5">
                  <span className="font-bold text-blue-900 uppercase block text-[10px]">Linked Domain Record</span>
                  {selectedUserDetail.entityInfo.identifier && <p>Identifier: <strong>{selectedUserDetail.entityInfo.identifier}</strong></p>}
                  {selectedUserDetail.entityInfo.gradeName && <p>Grade: <strong>{selectedUserDetail.entityInfo.gradeName}</strong></p>}
                  {selectedUserDetail.entityInfo.sectionName && <p>Section: <strong>{selectedUserDetail.entityInfo.sectionName}</strong></p>}
                  {selectedUserDetail.entityInfo.phoneNumber && <p>Phone: <strong>{selectedUserDetail.entityInfo.phoneNumber}</strong></p>}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
