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
    markAllNotificationsRead,
    getUnreadNotificationCount,
    sendMessage,
    getMyMessages,
    getMessagingUsers,
    deleteMessage,
    updateMessage,
    getMessagingSettings,
    updateMessagingSettings,
    getImportantNotices,
    createImportantNotice,
    updateImportantNotice,
    deleteImportantNotice,
    sendTeacherParentMessage,
    getTeacherParentContacts,
    sendTeacherStudentBroadcast,
    sendTeacherParentBroadcast
} from "./communication.controller.js";
import { requirePermission, requireScope, requireAuth } from "../authentication/authorization.middleware.js";

const router = Router();

// ── Notifications (per-user, org-scoped, available to all scopes) ──
// Every authenticated user (Federal, Region, Zone, Woreda, School) can access their own notifications.
router.get("/notifications", requireAuth(), getMyNotifications);
router.get("/notifications/unread-count", requireAuth(), getUnreadNotificationCount);
router.patch("/notifications/read-all", requireAuth(), markAllNotificationsRead);
router.patch("/notifications/:id/read", requireAuth(), markNotificationRead);

// Announcement Acknowledgment & Read Actions (Accessible to any recipient user)
router.post("/announcements/:id/acknowledge", requireAuth(), acknowledgeAnnouncement);
router.post("/announcements/:id/read", requireAuth(), markAnnouncementRead);

// ── Messaging Settings (School Toggles) ───────────────
router.get("/messaging-settings", requireAuth(), getMessagingSettings);
router.put("/messaging-settings", requireAuth(), updateMessagingSettings);

// ── Direct Messages (School org-scoped, accessible to Admin, Teacher, Student, Parent) ──
router.get("/messages", requireAuth(), getMyMessages);
router.post("/messages", requireAuth(), sendMessage);
router.get("/users", requireAuth(), getMessagingUsers);
router.patch("/messages/:id", requireAuth(), updateMessage);
router.put("/messages/:id", requireAuth(), updateMessage);
router.delete("/messages/:id", requireAuth(), deleteMessage);
router.delete("/message/:id", requireAuth(), deleteMessage);
router.patch("/message/:id", requireAuth(), updateMessage);
router.put("/message/:id", requireAuth(), updateMessage);

// Legacy path aliases
router.get("/notification", requireAuth(), getMyNotifications);
router.patch("/notification/:id/read", requireAuth(), markNotificationRead);
router.get("/message", requireAuth(), getMyMessages);
router.post("/message", requireAuth(), sendMessage);

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

// ── Teacher → Parent Messaging ─────────────────────────
// These endpoints are intentionally on the communication router so teacher
// client code can reach them via /api/communication/teacher/parent-contacts
// and /api/communication/teacher/message. The teacher module's legacy
// /api/teacher/parent-message endpoint is preserved separately.
// ── Teacher → Parent Messaging & Broadcast ─────────────
router.get("/teacher/parent-contacts", requirePermission("COMMUNICATION:VIEW"), getTeacherParentContacts);
router.post("/teacher/parent-message", requirePermission("COMMUNICATION:CREATE"), sendTeacherParentMessage);
router.post("/teacher/parent-broadcast", requirePermission("COMMUNICATION:CREATE"), sendTeacherParentBroadcast);

// ── Teacher → Student Messaging & Broadcast ─────────────
router.post("/teacher/student-broadcast", requirePermission("COMMUNICATION:CREATE"), sendTeacherStudentBroadcast);

export default router;
