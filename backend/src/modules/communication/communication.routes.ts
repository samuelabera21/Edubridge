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
    getMessagingUsers
} from "./communication.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Scope all communication operations to SCHOOL
router.use(requireScope("SCHOOL"));

// Announcements
router.post("/announcement", requirePermission("ACADEMIC:CREATE"), createAnnouncement);
router.get("/announcement", requirePermission("ACADEMIC:VIEW"), getAnnouncements);
router.delete("/announcement/:id", requirePermission("ACADEMIC:DELETE"), deleteAnnouncement);

// Internal/System Notifications
router.post("/notification/system", createNotification);
router.get("/notification", getMyNotifications);
router.patch("/notification/:id/read", markNotificationRead);

// Direct Messages
router.post("/message", sendMessage);
router.get("/message", getMyMessages);
router.get("/users", getMessagingUsers);

export default router;
