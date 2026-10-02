import { Router } from "express";
import {
    createAnnouncement,
    getAnnouncements,
    deleteAnnouncement,
    updateAnnouncement,
    getMyNotifications,
    markNotificationRead,
    getUnreadNotificationCount,
    sendMessage,
    getMyMessages,
    getMessagingUsers,
    deleteMessage,
    getImportantNotices,
    createImportantNotice,
    updateImportantNotice,
    deleteImportantNotice,
    sendTeacherParentMessage,
    getTeacherParentContacts
} from "./communication.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// All communication routes require SCHOOL scope
router.use(requireScope("SCHOOL"));

// ── Announcements ──────────────────────────────────────
router.get("/announcements", requirePermission("COMMUNICATION:VIEW"), getAnnouncements);
router.post("/announcements", requirePermission("COMMUNICATION:CREATE"), createAnnouncement);
router.put("/announcements/:id", requirePermission("COMMUNICATION:CREATE"), updateAnnouncement);
router.delete("/announcement/:id", requirePermission("COMMUNICATION:MANAGE"), deleteAnnouncement);
router.delete("/announcements/:id", requirePermission("COMMUNICATION:MANAGE"), deleteAnnouncement);

// ── Important Notices ──────────────────────────────────
router.get("/notices", requirePermission("COMMUNICATION:VIEW"), getImportantNotices);
router.post("/notices", requirePermission("COMMUNICATION:CREATE"), createImportantNotice);
router.put("/notices/:id", requirePermission("COMMUNICATION:CREATE"), updateImportantNotice);
router.delete("/notices/:id", requirePermission("COMMUNICATION:MANAGE"), deleteImportantNotice);
router.delete("/notice/:id", requirePermission("COMMUNICATION:MANAGE"), deleteImportantNotice);

// ── Notifications (per-user, org-scoped) ──────────────
// NOTE: No additional permission required — every authenticated school member
// can read and manage their own notifications.
router.get("/notifications", getMyNotifications);
router.get("/notifications/unread-count", getUnreadNotificationCount);
router.patch("/notifications/:id/read", markNotificationRead);

// Legacy path aliases (kept for backwards compat, deprecated)
router.get("/notification", getMyNotifications);
router.patch("/notification/:id/read", markNotificationRead);

// ── Direct Messages (org-scoped) ──────────────────────
router.get("/messages", requirePermission("COMMUNICATION:VIEW"), getMyMessages);
router.post("/messages", requirePermission("COMMUNICATION:CREATE"), sendMessage);
router.get("/users", requirePermission("COMMUNICATION:VIEW"), getMessagingUsers);
router.delete("/messages/:id", requirePermission("COMMUNICATION:VIEW"), deleteMessage);
router.delete("/message/:id", requirePermission("COMMUNICATION:VIEW"), deleteMessage);

// Legacy path aliases
router.get("/message", requirePermission("COMMUNICATION:VIEW"), getMyMessages);
router.post("/message", requirePermission("COMMUNICATION:CREATE"), sendMessage);

// ── Teacher → Parent Messaging ─────────────────────────
// These endpoints are intentionally on the communication router so teacher
// client code can reach them via /api/communication/teacher/parent-contacts
// and /api/communication/teacher/message. The teacher module's legacy
// /api/teacher/parent-message endpoint is preserved separately.
router.get("/teacher/parent-contacts", requirePermission("COMMUNICATION:VIEW"), getTeacherParentContacts);
router.post("/teacher/parent-message", requirePermission("COMMUNICATION:CREATE"), sendTeacherParentMessage);

export default router;
