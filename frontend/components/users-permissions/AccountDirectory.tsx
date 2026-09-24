"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Users, UserPlus, Search, Key, CheckCircle, 
  RefreshCw, Copy, Check, ShieldCheck, Lock, 
  Link as LinkIcon, AlertCircle, Eye, Power, X, ShieldAlert,
  ChevronLeft, ChevronRight, UserCheck, GraduationCap, School, Phone
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

  // Data state
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<{ total: number; active: number; deactivated: number }>({
    total: 0,
    active: 0,
    deactivated: 0
  });

  // Query & Filter states
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

  // Notification banners
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Unlinked entities for provisioning
  const [unlinkedTeachers, setUnlinkedTeachers] = useState<UnlinkedEntity[]>([]);
  const [unlinkedStudents, setUnlinkedStudents] = useState<UnlinkedEntity[]>([]);
  const [unlinkedParents, setUnlinkedParents] = useState<UnlinkedEntity[]>([]);
  const [unlinkedLoading, setUnlinkedLoading] = useState<boolean>(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [userToReset, setUserToReset] = useState<SystemUser | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [userToToggleStatus, setUserToToggleStatus] = useState<SystemUser | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<SystemUser | null>(null);

  // Credentials display modal
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; tempPass: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Provision Form state
  const [provisionMode, setProvisionMode] = useState<"EXISTING_ENTITY" | "NEW_ADMIN_STAFF">(
    accountType === "ADMINISTRATORS" || accountType === "SUPPORT_STAFF" ? "NEW_ADMIN_STAFF" : "EXISTING_ENTITY"
  );
  const [selectedEntityType, setSelectedEntityType] = useState<"TEACHER" | "STUDENT" | "PARENT">(
    accountType === "STUDENT" ? "STUDENT" : accountType === "PARENT" ? "PARENT" : "TEACHER"
  );
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formRole, setFormRole] = useState<string>(
    accountType === "ADMINISTRATORS" ? "VICE_PRINCIPAL" : accountType === "SUPPORT_STAFF" ? "SCHOOL_SUPPORT_STAFF" : "TEACHER"
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load accounts from API
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
      setUsers(data.items || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
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

  // Load unlinked entities for provisioning
  const loadUnlinkedEntities = async () => {
    try {
      setUnlinkedLoading(true);
      const res = await fetchApi("/authorization/unlinked-entities");
      if (res.ok) {
        const data = await res.json();
        setUnlinkedTeachers(data.teachers || []);
        setUnlinkedStudents(data.students || []);
        setUnlinkedParents(data.parents || []);
      }
    } catch (err) {
      console.error("Failed to load unlinked entities", err);
    } finally {
      setUnlinkedLoading(false);
    }
  };

  const handleOpenProvisionModal = () => {
    loadUnlinkedEntities();
    setProvisionMode(
      accountType === "ADMINISTRATORS" || accountType === "SUPPORT_STAFF" ? "NEW_ADMIN_STAFF" : "EXISTING_ENTITY"
    );
    setSelectedEntityType(
      accountType === "STUDENT" ? "STUDENT" : accountType === "PARENT" ? "PARENT" : "TEACHER"
    );
    setSelectedEntityId("");
    setFormName("");
    setFormEmail("");
    setFormRole(
      accountType === "ADMINISTRATORS" ? "VICE_PRINCIPAL" : accountType === "SUPPORT_STAFF" ? "SCHOOL_SUPPORT_STAFF" : "TEACHER"
    );
    setIsCreateModalOpen(true);
  };

  // Submit Provisioning
  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: any = {};

      if (provisionMode === "EXISTING_ENTITY") {
        if (!selectedEntityId) {
          throw new Error("Please select an existing person to provision.");
        }
        if (selectedEntityType === "TEACHER") {
          payload.teacherEntityId = selectedEntityId;
          const entity = unlinkedTeachers.find((t) => t.id === selectedEntityId);
          payload.name = entity?.name || "Teacher";
          payload.roleName = "TEACHER";
        } else if (selectedEntityType === "STUDENT") {
          payload.studentEntityId = selectedEntityId;
          const entity = unlinkedStudents.find((s) => s.id === selectedEntityId);
          payload.name = entity?.name || "Student";
          payload.roleName = "STUDENT";
        } else {
          payload.parentEntityId = selectedEntityId;
          const entity = unlinkedParents.find((p) => p.id === selectedEntityId);
          payload.name = entity?.name || "Parent";
          payload.roleName = "PARENT";
        }
      } else {
        if (!formName.trim() || !formEmail.trim()) {
          throw new Error("Full name and email/username are required.");
        }
        payload.name = formName.trim();
        payload.email = formEmail.trim();
        payload.roleName = formRole;
      }

      const res = await fetchApi("/authorization/create-user", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to provision user account.");
      }

      setIsCreateModalOpen(false);
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

  // Status Toggle
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
      setSuccessMsg(`Account for ${data.user.name} is now ${newStatus ? "Active" : "Deactivated"}.`);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to toggle status.");
    } finally {
      setSubmitting(false);
    }
  };

  // Password Reset
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
      setSuccessMsg(`Temporary password generated for ${userToReset.name}. Active sessions have been revoked.`);
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

  // Unlinked entity selector helper
  const getCurrentUnlinkedList = () => {
    if (selectedEntityType === "TEACHER") return unlinkedTeachers;
    if (selectedEntityType === "STUDENT") return unlinkedStudents;
    return unlinkedParents;
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
          {/* Summary counters */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-gray-600 bg-white border border-gray-200 px-3.5 py-1.5 rounded-lg shadow-2xs">
            <span>Total: <strong className="text-gray-900 font-semibold">{summary.total}</strong></span>
            <span className="text-gray-300">|</span>
            <span className="text-emerald-700">Active: <strong className="font-semibold">{summary.active}</strong></span>
            <span className="text-gray-300">|</span>
            <span className="text-slate-600">Deactivated: <strong className="font-semibold">{summary.deactivated}</strong></span>
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

      {/* Control Bar: Search & Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              accountType === "TEACHER"
                ? "Search by name, email, or employee ID..."
                : accountType === "STUDENT"
                ? "Search by name, email, or student ID..."
                : accountType === "PARENT"
                ? "Search by guardian name, email, or phone..."
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
            <option value="ACTIVE">Active</option>
            <option value="DEACTIVATED">Deactivated</option>
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
                <th className="py-3 px-4">Name / Person</th>
                <th className="py-3 px-4">Account Identifier</th>
                <th className="py-3 px-4">Role / Type</th>
                <th className="py-3 px-4">Linked Record</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                    <span>Loading institutional accounts...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <p className="font-medium text-gray-700">No user accounts found.</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {searchQuery || statusFilter !== "ALL" || roleFilter !== "ALL"
                        ? "Try adjusting your search query or filters."
                        : "No accounts have been created yet for this category."}
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <tr key={user.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Name & Identity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-200">
                            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 block">{user.name}</span>
                            {isSelf && (
                              <span className="inline-block text-[10px] text-blue-600 font-medium">
                                (Your Account)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email / Username */}
                      <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                        {user.email}
                      </td>

                      {/* Role / Type */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800 border border-gray-200">
                          {user.primaryRole.replace(/_/g, " ")}
                        </span>
                      </td>

                      {/* Linked Record Details */}
                      <td className="py-3 px-4 text-gray-600 text-[11px]">
                        {user.entityInfo ? (
                          <div className="flex items-center gap-1.5">
                            <LinkIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            {user.entityInfo.type === "TEACHER" && (
                              <span>ID: <strong>{user.entityInfo.identifier || "N/A"}</strong></span>
                            )}
                            {user.entityInfo.type === "STUDENT" && (
                              <span>
                                {user.entityInfo.identifier && `ID: ${user.entityInfo.identifier}`}
                                {user.entityInfo.gradeName && ` | ${user.entityInfo.gradeName}`}
                                {user.entityInfo.sectionName && ` (${user.entityInfo.sectionName})`}
                              </span>
                            )}
                            {user.entityInfo.type === "PARENT" && (
                              <span>
                                {user.entityInfo.linkedStudentsCount !== undefined
                                  ? `${user.entityInfo.linkedStudentsCount} Student(s)`
                                  : user.entityInfo.phoneNumber || "Guardian"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unlinked / Direct User</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            user.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {user.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View details */}
                          <button
                            onClick={() => setSelectedUserDetail(user)}
                            title="View Account Details"
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
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Activate / Deactivate Toggle */}
                          <button
                            onClick={() => {
                              if (isSelf) return;
                              setUserToToggleStatus(user);
                              setIsStatusModalOpen(true);
                            }}
                            disabled={isSelf}
                            title={isSelf ? "Cannot deactivate your own account" : user.isActive ? "Deactivate Account" : "Activate Account"}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelf
                                ? "text-gray-300 cursor-not-allowed"
                                : user.isActive
                                ? "text-gray-500 hover:text-rose-600 hover:bg-rose-50"
                                : "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
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

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-gray-50/50 border-t border-gray-200 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>
              Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
            </span>
            <span className="text-gray-300">|</span>
            <label className="flex items-center gap-1">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-700 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>
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
      {/* MODAL 1: Account Detail View                                              */}
      {/* ========================================================================= */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">Account Details</h3>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-base">
                  {selectedUserDetail.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{selectedUserDetail.name}</h4>
                  <p className="text-gray-500 font-mono text-[11px]">{selectedUserDetail.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-gray-600">
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase font-semibold">Account Status</span>
                  <span className={`font-semibold ${selectedUserDetail.isActive ? "text-emerald-700" : "text-slate-600"}`}>
                    {selectedUserDetail.isActive ? "Active (Login Allowed)" : "Deactivated"}
                  </span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase font-semibold">Primary Role</span>
                  <span className="font-semibold text-gray-900">{selectedUserDetail.primaryRole.replace(/_/g, " ")}</span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase font-semibold">School Scope</span>
                  <span className="font-semibold text-gray-900">{selectedUserDetail.scopeName || "Current School"}</span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <span className="text-[10px] text-gray-400 block uppercase font-semibold">Password Change Required</span>
                  <span className="font-semibold text-gray-900">{selectedUserDetail.requiresPasswordChange ? "Yes (At Next Login)" : "No"}</span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 col-span-2">
                  <span className="text-[10px] text-gray-400 block uppercase font-semibold">Created Date</span>
                  <span className="font-semibold text-gray-900">{new Date(selectedUserDetail.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Linked Record Details */}
              {selectedUserDetail.entityInfo && (
                <div className="border border-blue-100 bg-blue-50/50 p-3 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-blue-900 uppercase block tracking-wider">
                    Linked {selectedUserDetail.entityInfo.type} Record
                  </span>
                  {selectedUserDetail.entityInfo.type === "TEACHER" && (
                    <div className="text-gray-700 space-y-0.5">
                      <p>Employee ID: <strong>{selectedUserDetail.entityInfo.identifier || "N/A"}</strong></p>
                      {selectedUserDetail.entityInfo.jobTitle && <p>Job Title: <strong>{selectedUserDetail.entityInfo.jobTitle}</strong></p>}
                      {selectedUserDetail.entityInfo.qualification && <p>Qualification: <strong>{selectedUserDetail.entityInfo.qualification}</strong></p>}
                      {selectedUserDetail.entityInfo.employmentStatus && <p>Status: <strong>{selectedUserDetail.entityInfo.employmentStatus}</strong></p>}
                    </div>
                  )}
                  {selectedUserDetail.entityInfo.type === "STUDENT" && (
                    <div className="text-gray-700 space-y-0.5">
                      <p>Student ID: <strong>{selectedUserDetail.entityInfo.identifier || "N/A"}</strong></p>
                      {selectedUserDetail.entityInfo.gradeName && <p>Grade: <strong>{selectedUserDetail.entityInfo.gradeName}</strong></p>}
                      {selectedUserDetail.entityInfo.sectionName && <p>Section: <strong>{selectedUserDetail.entityInfo.sectionName}</strong></p>}
                      {selectedUserDetail.entityInfo.enrollmentStatus && <p>Enrollment: <strong>{selectedUserDetail.entityInfo.enrollmentStatus}</strong></p>}
                    </div>
                  )}
                  {selectedUserDetail.entityInfo.type === "PARENT" && (
                    <div className="text-gray-700 space-y-1">
                      {selectedUserDetail.entityInfo.phoneNumber && <p>Phone: <strong>{selectedUserDetail.entityInfo.phoneNumber}</strong></p>}
                      <p>Linked Children: <strong>{selectedUserDetail.entityInfo.linkedStudentsCount || 0}</strong></p>
                      {selectedUserDetail.entityInfo.children && selectedUserDetail.entityInfo.children.length > 0 && (
                        <div className="pt-1">
                          <ul className="list-disc pl-4 text-[11px] text-gray-600">
                            {selectedUserDetail.entityInfo.children.map((c) => (
                              <li key={c.id}>
                                {c.student.firstName} {c.student.lastName} ({c.student.studentId})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
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

      {/* ========================================================================= */}
      {/* MODAL 2: Provision Account Modal                                          */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">Provision User Account</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProvisionUser} className="p-6 space-y-4 text-xs">
              {/* Mode Selection */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">Provisioning Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProvisionMode("EXISTING_ENTITY");
                    }}
                    className={`py-2 px-3 rounded-lg border text-left font-medium transition-all ${
                      provisionMode === "EXISTING_ENTITY"
                        ? "border-blue-600 bg-blue-50/50 text-blue-900"
                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5 mb-1 text-blue-600" />
                    <span className="block font-semibold">Link Existing Person</span>
                    <span className="text-[10px] text-gray-500">Teacher, Student, or Parent</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProvisionMode("NEW_ADMIN_STAFF");
                    }}
                    className={`py-2 px-3 rounded-lg border text-left font-medium transition-all ${
                      provisionMode === "NEW_ADMIN_STAFF"
                        ? "border-blue-600 bg-blue-50/50 text-blue-900"
                        : "border-gray-200 hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mb-1 text-blue-600" />
                    <span className="block font-semibold">Leadership / Staff</span>
                    <span className="text-[10px] text-gray-500">Vice Principal, Staff</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: Existing Entity */}
              {provisionMode === "EXISTING_ENTITY" ? (
                <>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Entity Category</label>
                    <div className="flex gap-2">
                      {(["TEACHER", "STUDENT", "PARENT"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setSelectedEntityType(type);
                            setSelectedEntityId("");
                          }}
                          className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold capitalize ${
                            selectedEntityType === type
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {type.toLowerCase()}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Select Unlinked {selectedEntityType.charAt(0) + selectedEntityType.slice(1).toLowerCase()}
                    </label>
                    {unlinkedLoading ? (
                      <div className="py-3 text-center text-gray-500">Loading unlinked entities...</div>
                    ) : getCurrentUnlinkedList().length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                        No unlinked {selectedEntityType.toLowerCase()}s found in this school. All current records already possess login accounts.
                      </div>
                    ) : (
                      <select
                        value={selectedEntityId}
                        onChange={(e) => setSelectedEntityId(e.target.value)}
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="">-- Choose {selectedEntityType.toLowerCase()} --</option>
                        {getCurrentUnlinkedList().map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} {item.identifier ? `(${item.identifier})` : ""} {item.grade ? `[${item.grade}]` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </>
              ) : (
                /* Mode 2: Direct Admin / Staff */
                <>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Assigned Role</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="VICE_PRINCIPAL">Vice Principal</option>
                      <option value="SCHOOL_SUPPORT_STAFF">School Support Staff</option>
                      <option value="SCHOOL_ADMIN">School Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g., Jane Doe"
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Email / Username</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g., jdoe@edubridge.local"
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (provisionMode === "EXISTING_ENTITY" && (!selectedEntityId || getCurrentUnlinkedList().length === 0))}
                  className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Reset Password Confirmation                                      */}
      {/* ========================================================================= */}
      {isResetModalOpen && userToReset && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-amber-50/50">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-gray-900 text-sm">Reset Account Password</h3>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-gray-600">
              <p>
                Are you sure you want to reset the password for <strong className="text-gray-900">{userToReset.name}</strong> ({userToReset.email})?
              </p>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900 space-y-1">
                <p className="font-semibold">Security Safeguards:</p>
                <ul className="list-disc pl-4 text-[11px] space-y-0.5">
                  <li>A secure temporary password will be generated.</li>
                  <li>All active login sessions for this account will be revoked immediately.</li>
                  <li>The user will be required to choose a new password on their next login.</li>
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
                <span>Confirm Password Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Status Toggle Confirmation (Activate / Deactivate)               */}
      {/* ========================================================================= */}
      {isStatusModalOpen && userToToggleStatus && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Power className={`w-5 h-5 ${userToToggleStatus.isActive ? "text-rose-600" : "text-emerald-600"}`} />
                <h3 className="font-bold text-gray-900 text-sm">
                  {userToToggleStatus.isActive ? "Deactivate Account" : "Activate Account"}
                </h3>
              </div>
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-gray-600">
              <p>
                Are you sure you want to {userToToggleStatus.isActive ? "deactivate" : "activate"} login access for{" "}
                <strong className="text-gray-900">{userToToggleStatus.name}</strong> ({userToToggleStatus.email})?
              </p>
              {userToToggleStatus.isActive ? (
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-200 text-rose-900 text-[11px]">
                  Deactivating this account will immediately revoke their active sessions and prevent further logins. No domain records (Teacher, Student, Parent) will be deleted.
                </div>
              ) : (
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-emerald-900 text-[11px]">
                  Activating this account will restore standard login capabilities under their assigned role.
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
                <span>{userToToggleStatus.isActive ? "Deactivate Account" : "Activate Account"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: Temporary Credentials Display                                    */}
      {/* ========================================================================= */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-emerald-50">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-sm">Temporary Credentials</h3>
              </div>
              <button
                onClick={() => setCreatedCredentials(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-gray-600">
                Please copy and securely deliver these credentials to the user. The user will be required to change their password upon their initial sign-in.
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5 font-mono">
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
                    `EduBridge Login Credentials:\nUsername: ${createdCredentials.username}\nTemporary Password: ${createdCredentials.tempPass}`
                  )
                }
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold transition-colors border border-blue-200 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied to Clipboard!" : "Copy Full Credentials"}</span>
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
    </div>
  );
}
