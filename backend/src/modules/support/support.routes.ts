import { Router } from "express";
import { 
    getLearningDifficulties, createLearningDifficulty,
    getRemedialPrograms, createRemedialProgram,
    getEnrichmentPrograms, createEnrichmentProgram,
    getInterventionPlans, createInterventionPlan,
    getInterventionOutcomes, createInterventionOutcome,
    getInterventionMonitoring, createInterventionMonitoring
} from "./support.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();
router.use(requireScope("SCHOOL"));

// Learning Difficulties
router.get("/learning-difficulties", requirePermission("ACADEMIC:VIEW"), getLearningDifficulties);
router.post("/learning-difficulties", requirePermission("ACADEMIC:CREATE"), createLearningDifficulty);

// Remedial Programs
router.get("/remedial", requirePermission("ACADEMIC:VIEW"), getRemedialPrograms);
router.post("/remedial", requirePermission("ACADEMIC:CREATE"), createRemedialProgram);

// Enrichment Programs
router.get("/enrichment", requirePermission("ACADEMIC:VIEW"), getEnrichmentPrograms);
router.post("/enrichment", requirePermission("ACADEMIC:CREATE"), createEnrichmentProgram);

// Intervention Plans
router.get("/intervention-plans", requirePermission("ACADEMIC:VIEW"), getInterventionPlans);
router.post("/intervention-plans", requirePermission("ACADEMIC:CREATE"), createInterventionPlan);

// Monitoring
router.get("/monitoring", requirePermission("ACADEMIC:VIEW"), getInterventionMonitoring);
router.post("/monitoring", requirePermission("ACADEMIC:CREATE"), createInterventionMonitoring);

// Outcomes
router.get("/outcomes", requirePermission("ACADEMIC:VIEW"), getInterventionOutcomes);
router.post("/outcomes", requirePermission("ACADEMIC:CREATE"), createInterventionOutcome);

export default router;
