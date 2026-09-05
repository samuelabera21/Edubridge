import { Router } from "express";
import { 
    getInsights,
    createInsight,
    getSchoolPerformanceAI,
    getAttendanceAI,
    getStudentRiskAI,
    getPerformanceTrendsAI,
    getInterventionAI,
    getImprovementRecommendationsAI,
    processNaturalLanguageQuery,
    getExecutiveSummaryAI
} from "./ai-leadership.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();
router.use(requireScope("SCHOOL"));

// Generic AI Insights History
router.get("/insights", requirePermission("ACADEMIC:VIEW"), getInsights);
router.post("/insights", requirePermission("ACADEMIC:CREATE"), createInsight);

// 1. School Performance AI
router.get("/school-performance", requirePermission("ACADEMIC:VIEW"), getSchoolPerformanceAI);

// 2. Attendance AI
router.get("/attendance", requirePermission("ACADEMIC:VIEW"), getAttendanceAI);

// 3. Student Risk AI
router.get("/student-risk", requirePermission("ACADEMIC:VIEW"), getStudentRiskAI);

// 4. Performance Trends AI
router.get("/performance-trends", requirePermission("ACADEMIC:VIEW"), getPerformanceTrendsAI);

// 5. Intervention AI
router.get("/intervention", requirePermission("ACADEMIC:VIEW"), getInterventionAI);

// 6. School Improvement Recommendations AI
router.get("/improvement-recommendations", requirePermission("ACADEMIC:VIEW"), getImprovementRecommendationsAI);

// 7. Natural Language AI Query Engine
router.post("/natural-language", requirePermission("ACADEMIC:VIEW"), processNaturalLanguageQuery);

// 8. Executive Summaries Briefing AI
router.get("/executive-summaries", requirePermission("ACADEMIC:VIEW"), getExecutiveSummaryAI);

export default router;
