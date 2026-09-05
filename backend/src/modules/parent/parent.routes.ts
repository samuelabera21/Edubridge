import { Router } from "express";
import { 
    getParentProfile, 
    getParents,
    createParent, 
    linkParentToStudent, 
    unlinkParentFromStudent,
    getStudentParents,
    getMeetings, createMeeting,
    getNotifications, createNotification,
    getParticipations, createParticipation
} from "./parent.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Scope all parent operations to SCHOOL
router.use(requireScope("SCHOOL"));

// Parent self-service profile
router.get("/me", getParentProfile);

// Admin Parent Management & Linking APIs (use ACADEMIC permissions consistent with student/teacher modules)
router.get("/", requirePermission("ACADEMIC:VIEW"), getParents);
router.post("/", requirePermission("ACADEMIC:CREATE"), createParent);
router.post("/link", requirePermission("ACADEMIC:CREATE"), linkParentToStudent);
router.delete("/:parentId/link-student/:studentId", requirePermission("ACADEMIC:DELETE"), unlinkParentFromStudent);
router.get("/student/:studentId", requirePermission("ACADEMIC:VIEW"), getStudentParents);

// Domain 10: Meetings, Notifications & Participation
router.get("/meetings", requirePermission("ACADEMIC:VIEW"), getMeetings);
router.post("/meetings", requirePermission("ACADEMIC:CREATE"), createMeeting);

router.get("/notifications", requirePermission("ACADEMIC:VIEW"), getNotifications);
router.post("/notifications", requirePermission("ACADEMIC:CREATE"), createNotification);

router.get("/participations", requirePermission("ACADEMIC:VIEW"), getParticipations);
router.post("/participations", requirePermission("ACADEMIC:CREATE"), createParticipation);

export default router;
