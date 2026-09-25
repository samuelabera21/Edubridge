"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, Users, Key, RefreshCw, AlertCircle, 
  CheckCircle2, Lock, Shield, Info, ArrowRight, Layers
} from "lucide-react";
import { fetchApi } from "../../../../lib/api";

interface RolePermission {
  id: string;
  name: string;
  description?: string;
}

interface RoleData {
  id: string;
  name: string;
  description?: string;
  activeUsersCount: number;
  permissions: RolePermission[];
}

export default function RolesAndPermissionsPage() {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRolesAndPermissions = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetchApi("/authorization/roles-and-permissions");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to load roles and permissions");
      }
      const data = await res.json();
      const loadedRoles: RoleData[] = data.roles || [];
      setRoles(loadedRoles);
      if (loadedRoles.length > 0 && !selectedRoleId) {
        setSelectedRoleId(loadedRoles[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while fetching roles and permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRolesAndPermissions();
  }, []);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || roles[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Roles & Permissions</h1>
          <p className="text-xs text-gray-500 mt-1">
            Inspect canonical institutional roles, verified security capabilities, and active user distribution.
          </p>
        </div>

        <button
          onClick={loadRolesAndPermissions}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          <span>Refresh Matrix</span>
        </button>
      </div>

      {/* Alert Banner */}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-gray-500 bg-white border border-gray-200 rounded-xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <span className="text-xs">Loading role & permission definitions from database...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Roles Directory */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Institutional Roles ({roles.length})
              </span>
              <span className="text-[11px] text-gray-400">Click to inspect permissions</span>
            </div>

            <div className="space-y-2">
              {roles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/60 border-blue-500 ring-1 ring-blue-500 shadow-2xs"
                        : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ShieldCheck
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? "text-blue-600" : "text-gray-400"
                            }`}
                          />
                          <span className="font-bold text-xs text-gray-900">
                            {role.name.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2">
                          {role.description || "Core institutional security role."}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isSelected
                              ? "bg-blue-100 text-blue-800 border-blue-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          {role.activeUsersCount} {role.activeUsersCount === 1 ? "user" : "users"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Scoping Advisory Box */}
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-600 text-[11px] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Security Notice</span>
              </div>
              <p>
                Role definitions and security permissions are maintained centrally to preserve system integrity. User counts reflect active accounts belonging to your school.
              </p>
            </div>
          </div>

          {/* Right Column: Role Permissions Matrix */}
          <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl shadow-2xs overflow-hidden">
            {selectedRole ? (
              <div>
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 block">
                      Active Role Inspection
                    </span>
                    <h2 className="text-sm font-bold text-gray-900">
                      {selectedRole.name.replace(/_/g, " ")}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">
                      {selectedRole.permissions.length} Assigned {selectedRole.permissions.length === 1 ? "Permission" : "Permissions"}
                    </span>
                  </div>
                </div>

                {/* Description bar */}
                <div className="px-6 py-3 border-b border-gray-100 bg-blue-50/20 text-xs text-gray-600">
                  <p>{selectedRole.description || "Standard role-based access controls."}</p>
                </div>

                {/* Permissions List */}
                <div className="p-6">
                  {selectedRole.permissions.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      No explicit permissions are bound to this role.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedRole.permissions.map((perm) => (
                        <div
                          key={perm.id}
                          className="flex items-start gap-2.5 p-3 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <span className="font-semibold text-xs text-gray-900 block font-mono">
                              {perm.name}
                            </span>
                            <span className="text-[11px] text-gray-500 block">
                              {perm.description || "Enables authorized access to domain operations."}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-gray-400 text-xs">
                Select a role from the list to inspect its permissions.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
