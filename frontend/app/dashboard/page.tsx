"use client";

import { useAuth } from "../../hooks/useAuth";
import { Shield, MapPin, Key } from "lucide-react";

export default function DashboardOverview() {
    const { authData } = useAuth(); // Already verified by layout

    if (!authData) return null;

    const primaryAccess = authData.access[0];

    if (!primaryAccess) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-black">
                <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Access Assigned</h2>
                <p className="text-gray-600 max-w-md mx-auto">
                    Your account has been created, but you have not been assigned to any organization or role yet. Please contact your system administrator.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-black">
            <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Authorization Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-4">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <Key className="h-6 w-6 text-blue-700" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Current Role</h2>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Assigned Role</p>
                            <p className="font-semibold text-lg text-gray-900 bg-gray-50 inline-block px-3 py-1 rounded border border-gray-200">
                                {primaryAccess.role.name}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-2">Granted Permissions</p>
                            <div className="flex flex-wrap gap-2">
                                {primaryAccess.role.permissions.map((rp: any) => (
                                    <span key={rp.permission.id} className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                                        {rp.permission.name}
                                    </span>
                                ))}
                                {primaryAccess.role.permissions.length === 0 && (
                                    <span className="text-sm text-gray-500 italic">No specific permissions attached</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scope Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center space-x-3 mb-6 border-b border-gray-100 pb-4">
                        <div className="bg-green-100 p-2 rounded-lg">
                            <MapPin className="h-6 w-6 text-green-700" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Organizational Scope</h2>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Organization Name</p>
                            <p className="font-semibold text-lg text-gray-900">
                                {primaryAccess.scope.name}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Organization Level</p>
                            <span className="text-xs font-bold uppercase tracking-wider bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 inline-block">
                                {primaryAccess.scope.type}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
