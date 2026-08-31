"use client";

import { useState, useEffect } from "react";
import { 
  Users, UserPlus, Search, ShieldAlert, Key, CheckCircle, 
  RefreshCw, Copy, Check, ShieldCheck, Lock, Link as LinkIcon, AlertCircle
} from "lucide-react";
import { fetchApi } from "../../../../lib/api";

interface SystemUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  requiresPasswordChange: boolean;
  createdAt: string;
  roles: string[];
  scopeName: string;
  entityInfo?: {
    type: "TEACHER" | "STUDENT" | "PARENT";
    id: string;
    identifier: string;
  } | null;
}

interface UnlinkedEntity {
  id: string;
  name: string;
  identifier?: string;
}

export default function AdminUserManagementPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Unlinked Entities (Teachers, Students, Parents without login accounts)
  const [unlinkedTeachers, setUnlinkedTeachers] = useState<UnlinkedEntity[]>([]);
  const [unlinkedStudents, setUnlinkedStudents] = useState<UnlinkedEntity[]>([]);
  const [unlinkedParents, setUnlinkedParents] = useState<UnlinkedEntity[]>([]);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [createdUserCredentials, setCreatedUserCredentials] = useState<{ username: string; tempPass: string } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Form State
  const [provisionMode, setProvisionMode] = useState<"EXISTING_ENTITY" | "NEW_ADMIN_STAFF">("EXISTING_ENTITY");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formRole, setFormRole] = useState<string>("TEACHER");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      let url = "/authorization/users";
      const params = new URLSearchParams();
      if (selectedRole !== "ALL") params.append("role", selectedRole);
      if (searchQuery.trim() !== "") params.append("search", searchQuery.trim());
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetchApi(url);
      const res = await response.json();
      setUsers(res.users || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load user list");
    } finally {
      setLoading(false);
    }
  };

  const loadUnlinkedEntities = async () => {
    try {
      const response = await fetchApi("/authorization/unlinked-entities");
      const res = await response.json();
      setUnlinkedTeachers(res.teachers || []);
      setUnlinkedStudents(res.students || []);
      setUnlinkedParents(res.parents || []);
    } catch (err: any) {
      console.error("Failed to fetch unlinked entities", err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [selectedRole]);

  const handleOpenCreateModal = () => {
    loadUnlinkedEntities();
    setCreatedUserCredentials(null);
    setSelectedEntityId("");
    setFormName("");
    setFormEmail("");
    setIsCreateModalOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleEntitySelection = (entityId: string) => {
    setSelectedEntityId(entityId);
    if (!entityId) return;

    if (formRole === "TEACHER") {
      const target = unlinkedTeachers.find(t => t.id === entityId);
      if (target) setFormName(target.name);
    } else if (formRole === "STUDENT") {
      const target = unlinkedStudents.find(s => s.id === entityId);
      if (target) setFormName(target.name);
    } else if (formRole === "PARENT") {
      const target = unlinkedParents.find(p => p.id === entityId);
      if (target) setFormName(target.name);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg("Full Name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim() || undefined,
        roleName: formRole,
        scopeName: "EduBridge Demo School",
        scopeType: "SCHOOL"
      };

      if (provisionMode === "EXISTING_ENTITY" && selectedEntityId) {
        if (formRole === "TEACHER") payload.teacherEntityId = selectedEntityId;
        if (formRole === "STUDENT") payload.studentEntityId = selectedEntityId;
        if (formRole === "PARENT") payload.parentEntityId = selectedEntityId;
      }

      const response = await fetchApi("/authorization/create-user", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      const res = await response.json();

      if (!response.ok) {
        throw new Error(res.message || "Failed to provision user.");
      }

      setCreatedUserCredentials({
        username: res.user.email,
        tempPass: res.temporaryPassword
      });

      setSuccessMsg(`Account for ${res.user.name} provisioned successfully!`);
      setFormName("");
      setFormEmail("");
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to provision user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: SystemUser) => {
    try {
      setErrorMsg(null);
      const newStatus = !user.isActive;

      const response = await fetchApi(`/authorization/users/${user.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: newStatus })
      });
      const res = await response.json();

      if (!response.ok) {
        throw new Error(res.message || "Failed to update account status.");
      }

      setSuccessMsg(`Account for ${user.name} is now ${newStatus ? "ACTIVE" : "DEACTIVATED"}.`);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update account status.");
    }
  };

  const handleResetPassword = async (user: SystemUser) => {
    try {
      setErrorMsg(null);

      const response = await fetchApi(`/authorization/users/${user.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({})
      });
      const res = await response.json();

      if (!response.ok) {
        throw new Error(res.message || "Failed to reset password.");
      }

      setCreatedUserCredentials({
        username: user.email,
        tempPass: res.temporaryPassword
      });
      setIsResetModalOpen(true);
      setSuccessMsg(`Password reset for ${user.name}.`);
      loadUsers();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Metrics
  const totalUsers = users.length;
  const teachersCount = users.filter(u => u.roles.includes("TEACHER")).length;
  const vpCount = users.filter(u => u.roles.includes("VICE_PRINCIPAL")).length;
  const studentsCount = users.filter(u => u.roles.includes("STUDENT")).length;
  const parentsCount = users.filter(u => u.roles.includes("PARENT")).length;

  return (
    <div className="p-6 md:p-8 space-y-6 bg-[#f8fafc] min-h-screen text-gray-800">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2 text-[#006b3f] font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>School Governance & Security Control</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">User Account & Authentication Hub</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Central security control: View active system accounts, generate logins for registered personnel, reset passwords, and toggle account access.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center space-x-2 bg-[#006b3f] hover:bg-[#005431] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision User Account</span>
        </button>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 font-bold hover:text-red-700">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold hover:text-emerald-800">✕</button>
        </div>
      )}

      {/* Stats Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-gray-500">Total System Logins</p>
          <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-blue-600">Vice Principals</p>
          <p className="text-2xl font-bold text-blue-900">{vpCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-emerald-600">Teachers</p>
          <p className="text-2xl font-bold text-emerald-900">{teachersCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-amber-600">Students</p>
          <p className="text-2xl font-bold text-amber-900">{studentsCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-purple-600">Parents</p>
          <p className="text-2xl font-bold text-purple-900">{parentsCount}</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "ALL", label: "All Accounts" },
            { id: "VICE_PRINCIPAL", label: "Vice Principals" },
            { id: "TEACHER", label: "Teachers" },
            { id: "STUDENT", label: "Students" },
            { id: "PARENT", label: "Parents" },
            { id: "SCHOOL_SUPPORT_STAFF", label: "Support Staff" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedRole(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedRole === tab.id
                  ? "bg-[#006b3f] text-white shadow-xs"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-9 pr-4 py-2 focus:ring-2 focus:ring-[#006b3f] outline-none text-gray-800"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </form>
      </div>

      {/* User Directory Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#006b3f] mb-2" />
            <span>Loading user directory...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-2">
            <Users className="w-10 h-10 mx-auto text-gray-300" />
            <p className="font-semibold text-gray-700 text-sm">No accounts found</p>
            <p className="text-xs text-gray-400">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Assigned Role</th>
                  <th className="py-3.5 px-4">Linked Entity Record</th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Password Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#006b3f] font-bold flex items-center justify-center text-xs">
                          {user.name ? user.name[0].toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{user.name}</p>
                          <p className="text-[11px] text-gray-500 font-mono">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map(r => (
                          <span
                            key={r}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r === "ADMIN" || r === "SCHOOL_ADMIN"
                                ? "bg-red-100 text-red-800"
                                : r === "VICE_PRINCIPAL"
                                ? "bg-blue-100 text-blue-800"
                                : r === "TEACHER"
                                ? "bg-emerald-100 text-emerald-800"
                                : r === "STUDENT"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-600">
                      {user.entityInfo ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-mono border border-gray-200">
                          <LinkIcon className="w-3 h-3 text-gray-400" />
                          <span>{user.entityInfo.type}: {user.entityInfo.identifier}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[11px] font-medium">System Staff Account</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {user.isActive ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          <span>Deactivated</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {user.requiresPasswordChange ? (
                        <span className="text-amber-600 font-medium text-[11px] flex items-center space-x-1">
                          <Lock className="w-3 h-3" />
                          <span>Requires Change</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 font-medium text-[11px]">Active Password</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 cursor-pointer"
                          title="Reset to default password"
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors border cursor-pointer ${
                            user.isActive
                              ? "text-red-600 hover:bg-red-50 border-red-200"
                              : "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                          }`}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-[#006b3f]" />
                <span>Provision User Login Account</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createdUserCredentials ? (
              <div className="space-y-4 bg-emerald-50/80 p-5 rounded-xl border border-emerald-200">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>Account Provisioned Successfully!</span>
                </div>
                <p className="text-xs text-emerald-700">
                  Share these initial temporary credentials with the user. They will be forced to set a private password on first login.
                </p>

                <div className="bg-white p-3.5 rounded-lg border border-emerald-200 space-y-2 text-xs">
                  <div>
                    <span className="text-gray-500 font-medium">Username / Email:</span>
                    <p className="font-mono font-bold text-gray-900">{createdUserCredentials.username}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-medium">Temporary Password:</span>
                    <p className="font-mono font-bold text-gray-900">{createdUserCredentials.tempPass}</p>
                  </div>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => copyToClipboard(`Username: ${createdUserCredentials.username}\nPassword: ${createdUserCredentials.tempPass}`)}
                    className="flex-1 inline-flex items-center justify-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? "Copied to Clipboard!" : "Copy Credentials"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setCreatedUserCredentials(null);
                      setIsCreateModalOpen(false);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold text-xs rounded-xl hover:bg-gray-300 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4">
                {/* Provision Mode Selector */}
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setProvisionMode("EXISTING_ENTITY")}
                    className={`py-2 rounded-lg transition-colors cursor-pointer ${
                      provisionMode === "EXISTING_ENTITY" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Link Registered Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvisionMode("NEW_ADMIN_STAFF")}
                    className={`py-2 rounded-lg transition-colors cursor-pointer ${
                      provisionMode === "NEW_ADMIN_STAFF" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Create Admin Staff
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Assigned Institutional Role *</label>
                  <select
                    value={formRole}
                    onChange={(e) => {
                      setFormRole(e.target.value);
                      setSelectedEntityId("");
                    }}
                    className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-[#006b3f] outline-none text-gray-800 font-medium"
                  >
                    <option value="TEACHER">Teacher (TEACHER)</option>
                    <option value="VICE_PRINCIPAL">Vice Principal / Academic Leader (VICE_PRINCIPAL)</option>
                    <option value="STUDENT">Student (STUDENT)</option>
                    <option value="PARENT">Parent / Guardian (PARENT)</option>
                    <option value="SCHOOL_SUPPORT_STAFF">Support Staff (SCHOOL_SUPPORT_STAFF)</option>
                  </select>
                </div>

                {provisionMode === "EXISTING_ENTITY" ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Select Registered Entity Record *</label>
                    {formRole === "TEACHER" ? (
                      <select
                        value={selectedEntityId}
                        onChange={(e) => handleEntitySelection(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-[#006b3f] outline-none text-gray-800"
                      >
                        <option value="">-- Choose Unlinked Teacher --</option>
                        {unlinkedTeachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.identifier})</option>
                        ))}
                      </select>
                    ) : formRole === "STUDENT" ? (
                      <select
                        value={selectedEntityId}
                        onChange={(e) => handleEntitySelection(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-[#006b3f] outline-none text-gray-800"
                      >
                        <option value="">-- Choose Unlinked Student --</option>
                        {unlinkedStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.identifier})</option>
                        ))}
                      </select>
                    ) : formRole === "PARENT" ? (
                      <select
                        value={selectedEntityId}
                        onChange={(e) => handleEntitySelection(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-[#006b3f] outline-none text-gray-800"
                      >
                        <option value="">-- Choose Unlinked Parent --</option>
                        {unlinkedParents.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.identifier})</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded-xl">Vice Principals & Staff are created as direct admin staff accounts.</p>
                    )}
                  </div>
                ) : null}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abebe Bikila"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-[#006b3f] outline-none text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Email / Institutional Username (Optional)</label>
                  <input
                    type="text"
                    placeholder="Leave blank to auto-generate e.g. tch.2026.0001@edubridge.local"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl p-2.5 focus:ring-2 focus:ring-[#006b3f] outline-none text-gray-800"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">If empty, EduBridge auto-generates a standardized institutional username.</p>
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-semibold bg-[#006b3f] hover:bg-[#005431] text-white rounded-xl shadow-xs disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                  >
                    {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Provision Account</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Password Reset Confirmation Modal */}
      {isResetModalOpen && createdUserCredentials && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-gray-200">
            <div className="flex items-center space-x-2 text-blue-600 font-bold text-base border-b border-gray-100 pb-3">
              <Key className="w-5 h-5" />
              <span>Password Reset Complete</span>
            </div>

            <p className="text-xs text-gray-600">
              The user account password has been reset back to the initial temporary password. The user will be required to change it upon next login.
            </p>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-2 text-xs">
              <div>
                <span className="text-gray-500 font-medium">Username:</span>
                <p className="font-mono font-bold text-gray-900">{createdUserCredentials.username}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Temporary Password:</span>
                <p className="font-mono font-bold text-gray-900">{createdUserCredentials.tempPass}</p>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => copyToClipboard(`Username: ${createdUserCredentials.username}\nPassword: ${createdUserCredentials.tempPass}`)}
                className="flex-1 inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 rounded-xl transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied!" : "Copy Temporary Password"}</span>
              </button>
              <button
                onClick={() => {
                  setIsResetModalOpen(false);
                  setCreatedUserCredentials(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold text-xs rounded-xl hover:bg-gray-300 cursor-pointer"
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
