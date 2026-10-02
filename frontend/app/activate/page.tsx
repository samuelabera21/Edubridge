"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    Shield,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    Loader2,
    Check,
    AlertTriangle,
    LogIn
} from "lucide-react";

interface InvitationInfo {
    name: string;
    email: string;
    organizationName: string | null;
    organizationType: string | null;
}

function ActivatePageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token") || "";

    const [phase, setPhase] = useState<"loading" | "invalid" | "already_activated" | "form" | "success">("loading");
    const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
    const [invalidMessage, setInvalidMessage] = useState("");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [activatedEmail, setActivatedEmail] = useState("");

    // Password strength
    const lengthValid = password.length >= 8;
    const upperValid = /[A-Z]/.test(password);
    const lowerValid = /[a-z]/.test(password);
    const numberValid = /[0-9]/.test(password);
    const specialValid = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    const score = [lengthValid, upperValid, lowerValid, numberValid, specialValid].filter(Boolean).length;

    const strengthLabel = () => {
        if (score <= 1) return { label: "Weak", color: "#dc2626", barColor: "#dc2626" };
        if (score <= 3) return { label: "Moderate", color: "#d97706", barColor: "#d97706" };
        if (score === 4) return { label: "Strong", color: "#2563eb", barColor: "#2563eb" };
        return { label: "Very Strong", color: "#16a34a", barColor: "#16a34a" };
    };
    const strength = strengthLabel();

    useEffect(() => {
        if (!token) {
            setPhase("invalid");
            setInvalidMessage("No invitation token was provided. Please use the link from your invitation email.");
            return;
        }

        fetchApi(`/authorization/validate-invitation?token=${encodeURIComponent(token)}`)
            .then(r => r.json())
            .then(data => {
                if (!data.valid) {
                    if (data.alreadyActivated) {
                        setPhase("already_activated");
                    } else {
                        setPhase("invalid");
                        setInvalidMessage(data.message || "This invitation link is invalid.");
                    }
                    return;
                }
                setInvitationInfo({
                    name: data.name,
                    email: data.email,
                    organizationName: data.organizationName,
                    organizationType: data.organizationType
                });
                setPhase("form");
            })
            .catch(() => {
                setPhase("invalid");
                setInvalidMessage("Unable to validate invitation. Please try again or contact your administrator.");
            });
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (score < 4) {
            setError("Please create a stronger password meeting at least 4 of the 5 requirements.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetchApi("/authorization/activate-invitation", {
                method: "POST",
                body: JSON.stringify({ token, password, confirmPassword })
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Failed to activate account.");
                setSubmitting(false);
                return;
            }

            setActivatedEmail(data.email || invitationInfo?.email || "");
            setPhase("success");
        } catch {
            setError("A network error occurred. Please try again.");
            setSubmitting(false);
        }
    };

    const formatOrgType = (type: string | null) => {
        if (!type) return "Administrative";
        return type.charAt(0) + type.slice(1).toLowerCase();
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (phase === "loading") {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <div style={styles.loadingContainer}>
                        <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "#1a3a5c" }} />
                        <p style={{ color: "#3d4f62", marginTop: 12, fontSize: 14 }}>Validating your invitation…</p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Already Activated ─────────────────────────────────────────────────────
    if (phase === "already_activated") {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <div style={styles.header}>
                        <div style={styles.headerBadge}>FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA</div>
                        <div style={styles.headerTitle}>Ministry of Education — EduBridge</div>
                    </div>
                    <div style={{ padding: "40px 36px", textAlign: "center" }}>
                        <CheckCircle2 size={52} style={{ color: "#16a34a", marginBottom: 16 }} />
                        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a2533", margin: "0 0 8px" }}>
                            Account Already Activated
                        </h1>
                        <p style={{ fontSize: 14, color: "#3d4f62", lineHeight: 1.6, marginBottom: 28 }}>
                            Your account has already been set up. You can sign in using your email and password.
                        </p>
                        <button onClick={() => router.push("/(auth)/login")} style={styles.primaryBtn}>
                            <LogIn size={16} style={{ marginRight: 8 }} /> Go to Sign In
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Invalid ───────────────────────────────────────────────────────────────
    if (phase === "invalid") {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <div style={styles.header}>
                        <div style={styles.headerBadge}>FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA</div>
                        <div style={styles.headerTitle}>Ministry of Education — EduBridge</div>
                    </div>
                    <div style={{ padding: "40px 36px", textAlign: "center" }}>
                        <XCircle size={52} style={{ color: "#dc2626", marginBottom: 16 }} />
                        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a2533", margin: "0 0 8px" }}>
                            Invalid Invitation
                        </h1>
                        <p style={{ fontSize: 14, color: "#3d4f62", lineHeight: 1.6, maxWidth: 360, margin: "0 auto 28px" }}>
                            {invalidMessage}
                        </p>
                        <p style={{ fontSize: 12, color: "#8a9ab0" }}>
                            Contact the Federal Education Bureau if you believe this is an error.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Success ───────────────────────────────────────────────────────────────
    if (phase === "success") {
        return (
            <div style={styles.page}>
                <div style={styles.card}>
                    <div style={styles.header}>
                        <div style={styles.headerBadge}>FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA</div>
                        <div style={styles.headerTitle}>Ministry of Education — EduBridge</div>
                    </div>
                    <div style={{ padding: "40px 36px", textAlign: "center" }}>
                        <CheckCircle2 size={52} style={{ color: "#16a34a", marginBottom: 16 }} />
                        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a2533", margin: "0 0 8px" }}>
                            Account Activated
                        </h1>
                        <p style={{ fontSize: 14, color: "#3d4f62", lineHeight: 1.6, marginBottom: 28 }}>
                            Your account has been successfully activated. You can now sign in with your email
                            {activatedEmail && <> (<strong>{activatedEmail}</strong>)</>} and the password you just created.
                        </p>
                        <button onClick={() => router.push("/login")} style={styles.primaryBtn}>
                            <LogIn size={16} style={{ marginRight: 8 }} /> Sign In to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Form ─────────────────────────────────────────────────────────────────
    return (
        <div style={styles.page}>
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerBadge}>FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA</div>
                    <div style={styles.headerTitle}>Ministry of Education — EduBridge</div>
                </div>

                {/* Sub-banner */}
                <div style={styles.subBanner}>
                    OFFICIAL COMMUNICATION · ACCOUNT ACTIVATION
                </div>

                {/* Body */}
                <div style={{ padding: "32px 36px" }}>

                    {/* Icon + Title */}
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
                        <div style={styles.iconWrap}>
                            <Shield size={22} color="#1a3a5c" />
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a2533" }}>
                                Set Up Your Account
                            </h1>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8a9ab0" }}>
                                Administrative Account Activation
                            </p>
                        </div>
                    </div>

                    {/* Assignment Info Card */}
                    {invitationInfo && (
                        <div style={styles.infoCard}>
                            <div style={styles.infoCardLabel}>ASSIGNMENT DETAILS</div>
                            <div style={styles.infoRow}>
                                <span style={styles.infoKey}>Name</span>
                                <span style={styles.infoVal}>{invitationInfo.name}</span>
                            </div>
                            <div style={styles.infoRow}>
                                <span style={styles.infoKey}>Email</span>
                                <span style={styles.infoVal}>{invitationInfo.email}</span>
                            </div>
                            {invitationInfo.organizationName && (
                                <div style={styles.infoRow}>
                                    <span style={styles.infoKey}>Assigned To</span>
                                    <span style={styles.infoVal}>
                                        {formatOrgType(invitationInfo.organizationType)} · {invitationInfo.organizationName}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <p style={{ fontSize: 13, color: "#3d4f62", lineHeight: 1.6, marginBottom: 24 }}>
                        Please create a secure password for your administrative account.
                        This password will be used for all future sign-ins.
                    </p>

                    {/* Error Alert */}
                    {error && (
                        <div style={styles.errorAlert}>
                            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>

                        {/* New Password */}
                        <div style={{ marginBottom: 18 }}>
                            <label style={styles.label}>New Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Create a secure password"
                                    style={styles.input}
                                    required
                                    disabled={submitting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={styles.eyeBtn}
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>

                            {/* Strength bar */}
                            {password && (
                                <div style={{ marginTop: 8 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, color: "#8a9ab0" }}>Strength</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: strength.color }}>{strength.label}</span>
                                    </div>
                                    <div style={{ display: "flex", gap: 3, height: 4 }}>
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} style={{
                                                flex: 1, borderRadius: 2,
                                                backgroundColor: i <= score ? strength.barColor : "#e2e8f0",
                                                transition: "background-color 0.2s"
                                            }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={styles.label}>Confirm Password</label>
                            <div style={{ position: "relative" }}>
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter your password"
                                    style={{
                                        ...styles.input,
                                        borderColor: confirmPassword && password !== confirmPassword ? "#dc2626" : "#d1d9e0"
                                    }}
                                    required
                                    disabled={submitting}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    style={styles.eyeBtn}
                                >
                                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            {confirmPassword && password !== confirmPassword && (
                                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#dc2626" }}>Passwords do not match</p>
                            )}
                        </div>

                        {/* Requirements */}
                        <div style={styles.requirementsBox}>
                            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#1a3a5c", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                Password Requirements
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                                {[
                                    [lengthValid, "At least 8 characters"],
                                    [upperValid, "Uppercase letter (A–Z)"],
                                    [lowerValid, "Lowercase letter (a–z)"],
                                    [numberValid, "Number (0–9)"],
                                    [specialValid, "Special character (!@#…)"]
                                ].map(([met, label], i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: met ? "#16a34a" : "#94a3b8" }}>
                                        {met ? <Check size={12} /> : <span style={{ width: 12, display: "inline-block", textAlign: "center" }}>·</span>}
                                        <span style={{ fontWeight: met ? 600 : 400 }}>{label as string}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting || score < 4 || password !== confirmPassword || !confirmPassword}
                            style={{
                                ...styles.primaryBtn,
                                width: "100%",
                                justifyContent: "center",
                                opacity: (submitting || score < 4 || password !== confirmPassword || !confirmPassword) ? 0.55 : 1
                            }}
                        >
                            {submitting
                                ? <><Loader2 size={15} style={{ marginRight: 8, animation: "spin 1s linear infinite" }} />Activating Account…</>
                                : "Activate Account & Set Password"
                            }
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    This is a secure, official EduBridge system communication.<br />
                    © {new Date().getFullYear()} Federal Ministry of Education, Ethiopia.
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: "100vh",
        backgroundColor: "#f0f4f8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        fontFamily: "'Segoe UI', Arial, sans-serif"
    },
    card: {
        width: "100%",
        maxWidth: 520,
        backgroundColor: "#ffffff",
        border: "1px solid #dde3ea",
        borderRadius: 4,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
    },
    header: {
        backgroundColor: "#1a3a5c",
        padding: "20px 32px",
        borderBottom: "3px solid #d4a017"
    },
    headerBadge: {
        color: "#d4a017",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "2px",
        textTransform: "uppercase" as const,
        marginBottom: 4
    },
    headerTitle: {
        color: "#ffffff",
        fontSize: 17,
        fontWeight: 700,
        letterSpacing: "0.3px"
    },
    subBanner: {
        backgroundColor: "#eaf0f6",
        borderBottom: "1px solid #dde3ea",
        padding: "9px 32px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "1.5px",
        color: "#1a3a5c",
        textTransform: "uppercase" as const
    },
    iconWrap: {
        width: 48,
        height: 48,
        borderRadius: 4,
        backgroundColor: "#eaf0f6",
        border: "1px solid #dde3ea",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
    },
    infoCard: {
        backgroundColor: "#f0f4f8",
        borderLeft: "4px solid #1a3a5c",
        borderRadius: 2,
        padding: "14px 18px",
        marginBottom: 20
    },
    infoCardLabel: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "1.5px",
        color: "#1a3a5c",
        textTransform: "uppercase" as const,
        marginBottom: 10
    },
    infoRow: {
        display: "flex",
        gap: 12,
        marginBottom: 4
    },
    infoKey: {
        fontSize: 12,
        color: "#8a9ab0",
        minWidth: 90
    },
    infoVal: {
        fontSize: 12,
        color: "#1a2533",
        fontWeight: 600
    },
    label: {
        display: "block",
        fontSize: 12,
        fontWeight: 700,
        color: "#374151",
        marginBottom: 6
    },
    input: {
        width: "100%",
        padding: "10px 40px 10px 12px",
        border: "1px solid #d1d9e0",
        borderRadius: 3,
        fontSize: 13,
        color: "#1a2533",
        outline: "none",
        boxSizing: "border-box" as const,
        transition: "border-color 0.15s"
    },
    eyeBtn: {
        position: "absolute" as const,
        right: 10,
        top: "50%",
        transform: "translateY(-50%)",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "#8a9ab0",
        padding: 0,
        display: "flex",
        alignItems: "center"
    },
    requirementsBox: {
        backgroundColor: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: 3,
        padding: "14px 16px",
        marginBottom: 22
    },
    primaryBtn: {
        display: "inline-flex",
        alignItems: "center",
        padding: "12px 24px",
        backgroundColor: "#1a3a5c",
        color: "#ffffff",
        border: "none",
        borderRadius: 3,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        letterSpacing: "0.3px",
        transition: "opacity 0.15s"
    },
    errorAlert: {
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 3,
        padding: "10px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        fontSize: 12,
        color: "#991b1b",
        marginBottom: 16
    },
    footer: {
        backgroundColor: "#f0f4f8",
        borderTop: "1px solid #dde3ea",
        padding: "14px 32px",
        fontSize: 10,
        color: "#8a9ab0",
        textAlign: "center" as const,
        lineHeight: 1.6
    },
    loadingContainer: {
        padding: "60px 32px",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center"
    }
};

export default function ActivatePage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f4f8" }}>
                <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "#1a3a5c" }} />
            </div>
        }>
            <ActivatePageContent />
        </Suspense>
    );
}

