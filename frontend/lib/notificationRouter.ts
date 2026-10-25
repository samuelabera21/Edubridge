export interface NotificationItem {
    id?: string;
    title?: string | null;
    content?: string | null;
    link?: string | null;
}

export interface RouterContext {
    pathname?: string;
    roleName?: string;
    scopeType?: string;
}

export function extractQueryParam(link: string | null | undefined, param: string): string | null {
    if (!link) return null;
    try {
        const dummyUrl = new URL(link, "http://localhost");
        return dummyUrl.searchParams.get(param);
    } catch {
        return null;
    }
}

export function resolveNotificationRoute(
    n: NotificationItem,
    ctx: RouterContext = {}
): {
    url: string;
    type: "message" | "data-request" | "program" | "directive" | "attendance" | "assessment" | "general";
    meta: {
        contactId?: string | null;
        requestId?: string | null;
        programId?: string | null;
        programTitle?: string | null;
        directiveId?: string | null;
    };
} {
    const pathname = ctx.pathname || (typeof window !== "undefined" ? window.location.pathname : "");
    const roleName = ctx.roleName || "";
    const scopeType = ctx.scopeType || "";
    const rawLink = n.link || "";
    const titleLower = (n.title || "").toLowerCase();
    const contentLower = (n.content || "").toLowerCase();

    // 1. MESSAGES & DIRECT CHAT
    const isMessageRelated =
        titleLower.includes("message") ||
        titleLower.includes("chat") ||
        contentLower.includes("sent you a message") ||
        rawLink.includes("/communication/messages") ||
        rawLink.includes("tab=messages");

    if (isMessageRelated) {
        const contactId =
            extractQueryParam(rawLink, "contactId") ||
            extractQueryParam(rawLink, "senderId");
        const contactParam = contactId ? `?contactId=${contactId}` : "";

        let url = `/dashboard/communication/messages${contactParam}`;
        if (pathname.startsWith("/dashboard/student") || roleName === "STUDENT") {
            url = `/dashboard/student/communication/messages${contactParam}`;
        } else if (
            pathname.startsWith("/dashboard/teacher") ||
            roleName === "TEACHER"
        ) {
            url = `/dashboard/teacher/communication/messages${contactParam}`;
        } else if (pathname.startsWith("/dashboard/parent") || roleName === "PARENT") {
            url = `/dashboard/parent/communication/messages${contactParam}`;
        }

        return {
            url,
            type: "message",
            meta: { contactId },
        };
    }

    // 2. DATA REQUESTS & SURVEYS
    const isDataRequestRelated =
        titleLower.includes("data request") ||
        titleLower.includes("survey") ||
        titleLower.includes("submission") ||
        titleLower.includes("google form") ||
        rawLink.includes("data-request") ||
        rawLink.includes("tab=data-requests");

    if (isDataRequestRelated) {
        const requestId =
            extractQueryParam(rawLink, "requestId") ||
            extractQueryParam(rawLink, "id");
        const dataReqParam = requestId ? `&requestId=${requestId}` : "";

        let url = `/dashboard/data-requests${requestId ? `?requestId=${requestId}` : ""}`;
        if (
            pathname.startsWith("/dashboard/region") ||
            scopeType === "REGION" ||
            roleName === "REGION_ADMIN"
        ) {
            url = `/dashboard/region?tab=data-requests${dataReqParam}`;
        } else if (
            pathname.startsWith("/dashboard/zone") ||
            scopeType === "ZONE" ||
            roleName === "ZONE_ADMIN"
        ) {
            url = `/dashboard/zone?tab=data-requests${dataReqParam}`;
        } else if (
            pathname.startsWith("/dashboard/woreda") ||
            scopeType === "WOREDA" ||
            roleName === "WOREDA_ADMIN"
        ) {
            url = `/dashboard/woreda?tab=data-requests${dataReqParam}`;
        } else if (
            pathname.startsWith("/dashboard/federal") ||
            scopeType === "FEDERAL" ||
            roleName === "FEDERAL_ADMIN"
        ) {
            url = `/dashboard/federal?tab=data-requests${dataReqParam}`;
        }

        return {
            url,
            type: "data-request",
            meta: { requestId },
        };
    }

    // 3. PROGRAMS & INITIATIVES
    const isProgramRelated =
        titleLower.includes("initiative") ||
        titleLower.includes("program") ||
        rawLink.includes("/programs") ||
        rawLink.includes("tab=programs");

    if (isProgramRelated) {
        const programId =
            extractQueryParam(rawLink, "programId") ||
            extractQueryParam(rawLink, "id");

        let programTitle: string | null = null;
        if (n.title) {
            const match = n.title.match(
                /(?:Initiative|Program(?:\s+Status\s+Update(?:\s*\([^)]*\))?)?|Program\s+Acknowledged)\s*[:\-–]\s*(.+)$/i
            );
            if (match) {
                programTitle = match[1].trim();
            } else {
                const colonIdx = n.title.indexOf(":");
                if (colonIdx !== -1 && colonIdx < n.title.length - 1) {
                    programTitle = n.title.substring(colonIdx + 1).trim();
                } else {
                    programTitle = n.title.trim();
                }
            }
        }

        const params = new URLSearchParams();
        if (programId) params.set("programId", programId);
        if (programTitle) params.set("programTitle", programTitle);
        const paramStr = params.toString() ? `&${params.toString()}` : "";
        const questionParamStr = params.toString() ? `?${params.toString()}` : "";

        let url = `/dashboard/programs${questionParamStr}`;
        if (
            pathname.startsWith("/dashboard/region") ||
            scopeType === "REGION" ||
            roleName === "REGION_ADMIN"
        ) {
            url = `/dashboard/region?tab=programs${paramStr}`;
        } else if (
            pathname.startsWith("/dashboard/zone") ||
            scopeType === "ZONE" ||
            roleName === "ZONE_ADMIN"
        ) {
            url = `/dashboard/zone?tab=programs${paramStr}`;
        } else if (
            pathname.startsWith("/dashboard/woreda") ||
            scopeType === "WOREDA" ||
            roleName === "WOREDA_ADMIN"
        ) {
            url = `/dashboard/woreda?tab=programs${paramStr}`;
        } else if (
            pathname.startsWith("/dashboard/federal") ||
            scopeType === "FEDERAL" ||
            roleName === "FEDERAL_ADMIN"
        ) {
            url = `/dashboard/federal?tab=programs${paramStr}`;
        }

        return {
            url,
            type: "program",
            meta: { programId, programTitle },
        };
    }

    // 4. POLICIES & DIRECTIVES / ANNOUNCEMENTS
    const isDirectiveRelated =
        titleLower.includes("directive") ||
        titleLower.includes("policy") ||
        titleLower.includes("announcement") ||
        rawLink.includes("directives") ||
        rawLink.includes("announcements");

    if (
        isDirectiveRelated ||
        rawLink === "/dashboard/directives" ||
        rawLink.startsWith("/dashboard/directives?")
    ) {
        const directiveId =
            extractQueryParam(rawLink, "directiveId") ||
            extractQueryParam(rawLink, "id");
        const idParam = directiveId ? `&directiveId=${directiveId}` : "";

        let url = `/dashboard/communication/announcements?tab=directives${idParam}`;
        if (pathname.startsWith("/dashboard/student") || roleName === "STUDENT") {
            url = `/dashboard/student/communication${directiveId ? `?id=${directiveId}` : ""}`;
        } else if (
            pathname.startsWith("/dashboard/teacher") ||
            roleName === "TEACHER"
        ) {
            url = `/dashboard/teacher/communication/staff${directiveId ? `?id=${directiveId}` : ""}`;
        } else if (
            pathname.startsWith("/dashboard/region") ||
            scopeType === "REGION" ||
            roleName === "REGION_ADMIN"
        ) {
            url = `/dashboard/region?tab=directives&subTab=INCOMING${idParam}`;
        } else if (
            pathname.startsWith("/dashboard/zone") ||
            scopeType === "ZONE" ||
            roleName === "ZONE_ADMIN"
        ) {
            url = `/dashboard/zone?tab=directives&subTab=INCOMING${idParam}`;
        } else if (
            pathname.startsWith("/dashboard/woreda") ||
            scopeType === "WOREDA" ||
            roleName === "WOREDA_ADMIN"
        ) {
            url = `/dashboard/woreda?tab=directives&subTab=INCOMING${idParam}`;
        } else if (
            pathname.startsWith("/dashboard/federal") ||
            scopeType === "FEDERAL" ||
            roleName === "FEDERAL_ADMIN"
        ) {
            url = `/dashboard/federal?tab=directives${idParam}`;
        }

        return {
            url,
            type: "directive",
            meta: { directiveId },
        };
    }

    // 5. ATTENDANCE ALERTS
    const isAttendanceRelated =
        titleLower.includes("attendance") ||
        titleLower.includes("absent") ||
        titleLower.includes("truan") ||
        titleLower.includes("tardy") ||
        rawLink.includes("attendance");

    if (isAttendanceRelated) {
        let url = `/dashboard/attendance`;
        if (
            pathname.startsWith("/dashboard/teacher") ||
            roleName === "TEACHER"
        ) {
            url = `/dashboard/teacher/attendance`;
        } else if (
            pathname.startsWith("/dashboard/student") ||
            roleName === "STUDENT"
        ) {
            url = `/dashboard/student/attendance`;
        } else if (
            pathname.startsWith("/dashboard/parent") ||
            roleName === "PARENT"
        ) {
            url = `/dashboard/parent/attendance`;
        }

        return {
            url,
            type: "attendance",
            meta: {},
        };
    }

    // 6. ACADEMICS & ASSESSMENTS
    const isAssessmentRelated =
        titleLower.includes("grade") ||
        titleLower.includes("assessment") ||
        titleLower.includes("exam") ||
        titleLower.includes("result") ||
        titleLower.includes("assignment") ||
        titleLower.includes("quiz") ||
        rawLink.includes("assessment") ||
        rawLink.includes("academics");

    if (isAssessmentRelated) {
        let url = `/dashboard/assessment`;
        if (
            pathname.startsWith("/dashboard/teacher") ||
            roleName === "TEACHER"
        ) {
            url = `/dashboard/teacher/assessment`;
        } else if (
            pathname.startsWith("/dashboard/student") ||
            roleName === "STUDENT"
        ) {
            url = `/dashboard/student/assessments`;
        } else if (
            pathname.startsWith("/dashboard/parent") ||
            roleName === "PARENT"
        ) {
            url = `/dashboard/parent/academics`;
        }

        return {
            url,
            type: "assessment",
            meta: {},
        };
    }

    // 7. FALLBACK
    return {
        url: rawLink || "/dashboard",
        type: "general",
        meta: {},
    };
}

export function dispatchNotificationEvents(routeInfo: ReturnType<typeof resolveNotificationRoute>) {
    if (typeof window === "undefined") return;

    if (routeInfo.type === "data-request" && routeInfo.meta.requestId) {
        window.dispatchEvent(
            new CustomEvent("open-data-request-detail", {
                detail: { requestId: routeInfo.meta.requestId },
            })
        );
        setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent("open-data-request-detail", {
                    detail: { requestId: routeInfo.meta.requestId },
                })
            );
        }, 120);
    }

    if (routeInfo.type === "program" && (routeInfo.meta.programId || routeInfo.meta.programTitle)) {
        window.dispatchEvent(
            new CustomEvent("open-program-detail", {
                detail: {
                    programId: routeInfo.meta.programId,
                    programTitle: routeInfo.meta.programTitle,
                },
            })
        );
        setTimeout(() => {
            window.dispatchEvent(
                new CustomEvent("open-program-detail", {
                    detail: {
                        programId: routeInfo.meta.programId,
                        programTitle: routeInfo.meta.programTitle,
                    },
                })
            );
        }, 120);
    }
}
