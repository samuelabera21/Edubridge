import { Router } from "express";
import {
    createAnnouncement,
    getAnnouncements,
    getAnnouncementRecipientsHierarchy,
    deleteAnnouncement,
    updateAnnouncement,
    getAnnouncementStatus,
    acknowledgeAnnouncement,
    markAnnouncementRead,
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
import { requirePermission, requireScope, requireAuth } from "../authentication/authorization.middleware.js";

const router = Router();

// ── Notifications (per-user, org-scoped, available to all scopes) ──
// Every authenticated user (Federal, Region, Zone, Woreda, School) can access their own notifications.
router.get("/notifications", requireAuth(), getMyNotifications);
router.get("/notifications/unread-count", requireAuth(), getUnreadNotificationCount);
router.patch("/notifications/:id/read", requireAuth(), markNotificationRead);

// Announcement Acknowledgment & Read Actions (Accessible to any recipient user)
router.post("/announcements/:id/acknowledge", requireAuth(), acknowledgeAnnouncement);
router.post("/announcements/:id/read", requireAuth(), markAnnouncementRead);

// Legacy path aliases (kept for backwards compat, deprecated)
router.get("/notification", requireAuth(), getMyNotifications);
router.patch("/notification/:id/read", requireAuth(), markNotificationRead);

// All other school communication features require SCHOOL scope
router.use(requireScope("SCHOOL"));

// ── Announcements ──────────────────────────────────────
router.get("/announcements/recipients-tree", requirePermission("COMMUNICATION:VIEW"), getAnnouncementRecipientsHierarchy);
router.get("/announcements", requirePermission("COMMUNICATION:VIEW"), getAnnouncements);
router.get("/announcements/:id/status", requirePermission("COMMUNICATION:VIEW"), getAnnouncementStatus);
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
