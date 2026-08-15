import { Router } from "express";
import { 
    createAnnouncement, 
    getAnnouncements,
    createNotification,
    getMyNotifications,
    markNotificationRead,
    sendMessage,
    getMyMessages
} from "./communication.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/communication/announcement:
 *   post:
 *     tags: [Communication]
 *     summary: Create a new announcement for the school
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/announcement", requireScope("SCHOOL"), requirePermission("COMMUNICATION:CREATE"), createAnnouncement);

/**
 * @openapi
 * /api/communication/announcement:
 *   get:
 *     tags: [Communication]
 *     summary: Get all announcements for the school
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/announcement", requireScope("SCHOOL"), requirePermission("COMMUNICATION:VIEW"), getAnnouncements);

/**
 * @openapi
 * /api/communication/notification/system:
 *   post:
 *     tags: [Communication]
 *     summary: Internal/System endpoint to create a notification for a user
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/notification/system", requireScope("FEDERAL"), requirePermission("SYSTEM:ADMIN"), createNotification);

/**
 * @openapi
 * /api/communication/notification:
 *   get:
 *     tags: [Communication]
 *     summary: Get my notifications
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/notification", getMyNotifications);

/**
 * @openapi
 * /api/communication/notification/{id}/read:
 *   patch:
 *     tags: [Communication]
 *     summary: Mark a notification as read
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.patch("/notification/:id/read", markNotificationRead);

/**
 * @openapi
 * /api/communication/message:
 *   post:
 *     tags: [Communication]
 *     summary: Send a direct message to another user
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/message", requirePermission("COMMUNICATION:CREATE"), sendMessage);

/**
 * @openapi
 * /api/communication/message:
 *   get:
 *     tags: [Communication]
 *     summary: Get direct messages (optionally filtered by a specific user)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/message", requirePermission("COMMUNICATION:VIEW"), getMyMessages);

export default router;
