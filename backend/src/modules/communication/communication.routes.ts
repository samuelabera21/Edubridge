import { Router } from "express";
import { 
    createAnnouncement, 
    getAnnouncements,
    deleteAnnouncement,
    createNotification,
    getMyNotifications,
    markNotificationRead,
    sendMessage,
    getMyMessages,
    getMessagingUsers,
    getImportantNotices,
    createImportantNotice
} from "./communication.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Scope all communication operations to SCHOOL
router.use(requireScope("SCHOOL"));

// Announcements (both singular and plural)
router.post("/announcements", requirePermission("ACADEMIC:CREATE"), createAnnouncement);
router.get("/announcements", requirePermission("ACADEMIC:VIEW"), getAnnouncements);
router.post("/announcement", requirePermission("ACADEMIC:CREATE"), createAnnouncement);
router.get("/announcement", requirePermission("ACADEMIC:VIEW"), getAnnouncements);
router.delete("/announcement/:id", requirePermission("ACADEMIC:DELETE"), deleteAnnouncement);

// Important Notices & Directives
router.get("/notices", requirePermission("ACADEMIC:VIEW"), getImportantNotices);
router.post("/notices", requirePermission("ACADEMIC:CREATE"), createImportantNotice);

// Internal/System Notifications
router.post("/notification/system", createNotification);
router.get("/notification", getMyNotifications);
router.patch("/notification/:id/read", markNotificationRead);

// Direct Messages
router.post("/message", sendMessage);
router.get("/message", getMyMessages);
router.get("/users", getMessagingUsers);

export default router;
