"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Building2, Save, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function SchoolProfilePage() {
    const { authData } = useAuth(); // Auth verified by layout
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    const [schoolName, setSchoolName] = useState("");
    const [formData, setFormData] = useState({
        establishedYear: "",
        contactEmail: "",
        phoneNumber: "",
        address: "",
    });

    const hasUpdatePermission = authData?.access.some(acc => 
        acc.role.permissions.some((p: any) => p.permission.name === "SCHOOL:UPDATE")
    );

    useEffect(() => {
        let mounted = true;

        async function loadProfile() {
            try {
                const res = await fetchApi("/school/profile");
                if (!res.ok) {
                    if (res.status === 403) setError("You do not have permission to view the school profile.");
                    else setError("Failed to load school profile.");
                    setLoading(false);
                    return;
                }
                
                const data = await res.json();
                if (mounted) {
                    setSchoolName(data.school?.name || "");
                    if (data.profile) {
                        setFormData({
                            establishedYear: data.profile.establishedYear?.toString() || "",
                            contactEmail: data.profile.contactEmail || "",
                            phoneNumber: data.profile.phoneNumber || "",
                            address: data.profile.address || "",
                        });
                    }
                    setLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError("Network error occurred while loading profile.");
                    setLoading(false);
                }
            }
        }

        loadProfile();

        return () => {
            mounted = false;
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setSaving(true);

        try {
            const payload = {
                establishedYear: formData.establishedYear ? parseInt(formData.establishedYear, 10) : null,
                contactEmail: formData.contactEmail || null,
                phoneNumber: formData.phoneNumber || null,
                address: formData.address || null,
            };

            const res = await fetchApi("/school/profile", {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.message || "Failed to update profile. Check your permissions.");
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError("Network error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingState message="Loading school profile..." />;
    }

    if (error && !schoolName) {
        return <ErrorState message={error} onRetry={() => window.location.reload()} />;
    }

    return (
        <div className="max-w-3xl text-black">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                    <Building2 className="h-6 w-6 text-blue-700" />
                    <span>School Profile</span>
                </h1>
                <p className="text-gray-500 mt-1">Manage core information for {schoolName}</p>
            </div>

            {error && (
                <div className="mb-6">
                    <ErrorState title="Error" message={error} />
                </div>
            )}

            {success && (
                <div className="bg-green-50 text-green-700 p-4 rounded-md border border-green-200 mb-6 flex items-start space-x-3">
                    <CheckCircle2 className="h-5 w-5 mt-0.5" />
                    <p>School profile updated successfully.</p>
                </div>
            )}

            <Card>
                <CardContent className="sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                        <input
                            type="text"
                            value={schoolName}
                            disabled
                            className="w-full border border-gray-200 bg-gray-50 rounded-md p-2.5 text-gray-500 cursor-not-allowed"
                            title="Organization name is fixed by the system hierarchy"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Established Year</label>
                            <input
                                type="number"
                                name="establishedYear"
                                value={formData.establishedYear}
                                onChange={handleChange}
                                disabled={!hasUpdatePermission || saving}
                                className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                                placeholder="e.g. 1995"
                                min="1800"
                                max={new Date().getFullYear()}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                            <input
                                type="email"
                                name="contactEmail"
                                value={formData.contactEmail}
                                onChange={handleChange}
                                disabled={!hasUpdatePermission || saving}
                                className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                                placeholder="info@school.edu.et"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Official Phone Number</label>
                        <input
                            type="tel"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            disabled={!hasUpdatePermission || saving}
                            className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                            placeholder="+251 911 000 000"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            disabled={!hasUpdatePermission || saving}
                            rows={3}
                            className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                            placeholder="Woreda, Zone, Region, Specific location details"
                        ></textarea>
                    </div>

                    {hasUpdatePermission ? (
                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <Button
                                type="submit"
                                isLoading={saving}
                                leftIcon={<Save className="h-5 w-5" />}
                            >
                                Save Profile
                            </Button>
                        </div>
                    ) : (
                        <div className="pt-4 border-t border-gray-100 text-sm text-gray-500 italic">
                            You do not have permission to update the school profile.
                        </div>
                    )}
                </form>
                </CardContent>
            </Card>
        </div>
    );
}
