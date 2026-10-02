import { Router } from "express";
import { 
    getParentProfile, 
    getParents,
    getGuardians,
    getGuardianDetail,
    createParent, 
    updateGuardian,
    linkParentToStudent, 
    updateRelationship,
    unlinkParentFromStudent,
    getStudentParents,
    getSchoolStudentsForLinking,
    getFilterOptions,
    getMeetings, createMeeting,
    getNotifications, createNotification,
    getParticipations, createParticipation
} from "./parent.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Scope all parent operations to SCHOOL
router.use(requireScope("SCHOOL"));

// Parent self-service profile (Parent Portal)
router.get("/me", getParentProfile);

// Step 11: Admin Parent & Guardian Management APIs
router.get("/admin/guardians", requirePermission("ACADEMIC:VIEW"), getGuardians);
router.get("/admin/guardians/:id", requirePermission("ACADEMIC:VIEW"), getGuardianDetail);
router.post("/admin/guardians", requirePermission("ACADEMIC:CREATE"), createParent);
router.put("/admin/guardians/:id", requirePermission("ACADEMIC:CREATE"), updateGuardian);

router.post("/admin/link", requirePermission("ACADEMIC:CREATE"), linkParentToStudent);
router.put("/admin/link/:parentId/:studentId", requirePermission("ACADEMIC:CREATE"), updateRelationship);
router.delete("/admin/link/:parentId/:studentId", requirePermission("ACADEMIC:DELETE"), unlinkParentFromStudent);

router.get("/admin/student/:studentId", requirePermission("ACADEMIC:VIEW"), getStudentParents);
router.get("/admin/students", requirePermission("ACADEMIC:VIEW"), getSchoolStudentsForLinking);
router.get("/admin/filters", requirePermission("ACADEMIC:VIEW"), getFilterOptions);

// Backward-compatible routes
router.get("/", requirePermission("ACADEMIC:VIEW"), getGuardians);
router.post("/", requirePermission("ACADEMIC:CREATE"), createParent);
router.post("/link", requirePermission("ACADEMIC:CREATE"), linkParentToStudent);
router.delete("/:parentId/link-student/:studentId", requirePermission("ACADEMIC:DELETE"), unlinkParentFromStudent);
router.get("/student/:studentId", requirePermission("ACADEMIC:VIEW"), getStudentParents);

// Domain 10: Meetings, Notifications & Participation (Retained for system compatibility)
router.get("/meetings", requirePermission("ACADEMIC:VIEW"), getMeetings);
router.post("/meetings", requirePermission("ACADEMIC:CREATE"), createMeeting);

router.get("/notifications", requirePermission("ACADEMIC:VIEW"), getNotifications);
router.post("/notifications", requirePermission("ACADEMIC:CREATE"), createNotification);

router.get("/participations", requirePermission("ACADEMIC:VIEW"), getParticipations);
router.post("/participations", requirePermission("ACADEMIC:CREATE"), createParticipation);

export default router;
