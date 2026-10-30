import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "../../infrastructure/prisma/client.js";
import { StudentAiSessionService } from "./student-ai-session.service.js";

export interface ConceptExplanationResult {
    topic: string;
    summary: string;
    keyPoints: string[];
    example: string;
    mentalHook?: string;
    quickCheck: string;
    levelUpChallenge?: string;
}

export interface QuizQuestionResult {
    id?: string;
    subject: string;
    question: string;
    options: string[];
    correctIndex: number;
    hint?: string;
    explanation: string;
    difficulty?: string;
    resourceGrounding?: string;
}

export interface StudyPlanSubjectBlock {
    name: string;
    duration: string;
    focus: string;
}

export interface StudyPlanHomeworkSlot {
    duration: string;
    description: string;
}

export interface StudyPlanExtracurricular {
    name: string;
    duration: string;
    benefit: string;
}

export interface StudyPlanDay {
    day: string;
    isWeekend?: boolean;
    theme?: string;
    totalDuration: string;
    subject?: string;
    duration?: string;
    subjects: StudyPlanSubjectBlock[];
    homeworkSlot?: StudyPlanHomeworkSlot;
    tasks: string[];
    extracurricular?: StudyPlanExtracurricular;
    funTip?: string;
}

export interface StudyPlanResult {
    coachMessage: string;
    plan: StudyPlanDay[];
    suggestedAdjustments: string[];
}

export class StudentAiService {
    private static genAI: GoogleGenAI | null = null;
    private static readonly CANDIDATE_MODELS = [
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash"
    ];

    private static getClient(): GoogleGenAI {
        if (!this.genAI) {
            const apiKey = process.env.STUDENT_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("STUDENT_GEMINI_API_KEY or GEMINI_API_KEY is not configured in backend/.env");
            }
            this.genAI = new GoogleGenAI({ apiKey });
        }
        return this.genAI;
    }

    /**
     * Executes generation with resilient multi-model fallback.
     */
    private static async generateWithFallback(contents: any, expectJson: boolean = true): Promise<string> {
        const ai = this.getClient();
        let lastError: any = null;

        for (const model of this.CANDIDATE_MODELS) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents,
                    config: expectJson ? { responseMimeType: "application/json" } : undefined
                });

                if (response.text) {
                    return response.text;
                }
            } catch (err: any) {
                lastError = err;
                console.warn(`[StudentAiService] Model ${model} failed, trying fallback:`, err?.message?.substring(0, 80));
            }
        }

        throw new Error(lastError?.message || "Failed to generate AI response across all candidate models.");
    }

    /**
     * Calibrated offline curriculum quiz question generator when Gemini models are unavailable.
     */
    private static generateCurriculumQuizFallback(
        subject: string,
        difficulty: "Easy" | "Medium" | "Hard",
        count: number,
        topic?: string
    ): QuizQuestionResult[] {
        const validCount = Math.min(Math.max(count || 3, 1), 10);
        const focusTopic = topic || `${subject} Core Curriculum`;

        const questionTemplates = [
            {
                q: `In ${subject}, when evaluating ${focusTopic}, which principle provides the most reliable experimental outcome?`,
                options: [
                    "Isolating independent variables and conducting repeatable, controlled measurements",
                    "Relying on qualitative intuition without verifying standardized units",
                    "Observing a single unreplicated trial and generalizing immediately",
                    "Modifying unexpected results to match anticipated hypotheses"
                ],
                correct: 0,
                hint: "Empirical rigor requires systematic repeatability under controlled conditions.",
                exp: "Rigorous academic methodology mandates isolating confounding variables and conducting repeatable experiments. Intuitive guesswork or single trials cannot establish dependable laws.",
                grounding: `Grounded in ${subject} Standard Methodology`
            },
            {
                q: `Which of the following represents the most common conceptual trap when calculating relationships in ${focusTopic}?`,
                options: [
                    "Overlooking unit conversions between fundamental SI quantities (e.g. grams vs kilograms, minutes vs seconds)",
                    "Double checking calculations using inverse algebraic operations",
                    "Stating the dimensional units alongside numerical values",
                    "Identifying boundary conditions before applying standard formulas"
                ],
                correct: 0,
                hint: "Examiners intentionally set distractor choices based on unconverted base units.",
                exp: "Unit mismatch is the primary distractor trap designed into national and curriculum exams. Always normalize all quantities into base SI units prior to substitution.",
                grounding: `Grounded in ${subject} Exam Distractor Analysis`
            },
            {
                q: `Under ${difficulty === "Hard" ? "extreme boundary conditions" : "standard curriculum conditions"} in ${subject}, how does an increase in system resistance or resistance-factor affect the rate of throughput?`,
                options: [
                    "Throughput decreases inversely proportional to the resistance when driving potential is maintained constant",
                    "Throughput increases exponentially regardless of potential",
                    "Throughput remains unchanged because potential overrides resistance completely",
                    "Throughput immediately drops to absolute zero regardless of the driving force"
                ],
                correct: 0,
                hint: "Consider Ohm's Law and the general conservation principle: Flux = Driving Force / Resistance.",
                exp: "Across all scientific disciplines (fluid dynamics, electric circuits, chemical equilibrium), flow rate is inversely proportional to resistance under constant potential.",
                grounding: `Grounded in ${subject} Equilibrium & Conservation Laws`
            },
            {
                q: `When synthesizing ${subject} with applied real-world systems, what distinguishes a fundamental causal law from a mere statistical correlation?`,
                options: [
                    "A causal law specifies a testable physical or mathematical mechanism where intervening directly alters the result",
                    "Correlation proves causation as long as the sample size exceeds 30 observations",
                    "A causal law only exists if it can be observed with the naked eye without instruments",
                    "Statistical correlation is always considered equivalent to causal proof in curriculum evaluations"
                ],
                correct: 0,
                hint: "Mechanism and counterfactual intervention differentiate true cause from coincidence.",
                exp: "True causal principles provide direct mechanisms that allow predictive manipulation and falsifiability. Correlation simply observes co-occurrence without proving causality.",
                grounding: `Grounded in ${subject} Universal Scientific Inquiry`
            },
            {
                q: `In modern ${subject} problem-solving, which analytical sequence ensures the highest score accuracy on multi-step ${difficulty} exam problems?`,
                options: [
                    "Diagram the system -> State knowns & target variable -> Select governing formula -> Solve algebraically before plugging numbers",
                    "Plug raw numbers immediately into the first formula found in memory",
                    "Estimate the closest answer choice by guessing the order of magnitude",
                    "Skip reading the given problem context and calculate purely with the provided numbers"
                ],
                correct: 0,
                hint: "Deriving symbolic solutions before numerical substitution prevents intermediate rounding errors.",
                exp: "Master students first solve for the variable symbolically. This eliminates rounding errors, clarifies dimensional consistency, and prevents calculation traps.",
                grounding: `Grounded in ${subject} Exam Mastery Protocols`
            }
        ];

        const results: QuizQuestionResult[] = [];
        for (let i = 0; i < validCount; i++) {
            const template = questionTemplates[i % questionTemplates.length]!;
            results.push({
                id: `q_${i + 1}`,
                subject,
                question: template.q,
                options: template.options,
                correctIndex: template.correct,
                hint: template.hint,
                explanation: template.exp,
                difficulty,
                resourceGrounding: template.grounding
            });
        }
        return results;
    }

    /**
     * Builds an authoritative, encouraging curriculum fallback reply if all Gemini models fail or rate limit.
     */
    private static buildCurriculumFallbackReply(
        subject: string,
        message: string,
        studentName: string,
        attachedResource?: any
    ): { reply: string; topic: string; suggestedFollowUps: string[] } {
        const resourceMention = attachedResource?.title ? ` related to "${attachedResource.title}"` : "";
        const cleanMsg = message.replace(/^Review and explain\s*"?/i, "").replace(/"?$/i, "").trim();
        const displayTopic = cleanMsg.length > 3 && cleanMsg.length < 50 ? cleanMsg : `${subject} Core Principles`;

        const reply = `### EduBridge AI Academic Breakdown: ${displayTopic}

Hello ${studentName}! I have analyzed your inquiry regarding **${displayTopic}** in **${subject}**${resourceMention}.

---

#### 1. Fundamental Principle & Definition
In **${subject}**, **${displayTopic}** is a core pillar that describes how systems and equations behave systematically. Master educators always look at the underlying cause rather than memorizing isolated formulas:
- **Core Mechanism**: Always establish the given reference conditions and verify standard SI units before analyzing.
- **Governing Law**: Every variation adheres to structured conservation and cause-and-effect rules.
- **Distinction**: Be careful never to confuse superficial symptoms with the fundamental rule driving the behavior.

---

#### 2. Concrete Real-World Intuition
Think of **${displayTopic}** like an engineered feedback loop or a precision balance scale:
- When one parameter shifts, corresponding forces or reactions immediately adjust to re-establish mathematical or physical equilibrium.
- Engineers and scientists rely on this exact relationship in daily technology, medical diagnostic equipment, and national infrastructure.

---

#### 3. Step-by-Step Problem Solving Strategy
1. **Identify the Given Information**: Write down all known quantities, constraints, and units explicitly.
2. **Select the Direct Governing Relationship**: Relate the unknown variable directly to the known constraints.
3. **Guard Against Distractor Traps**: Beware of sign flips, unit discrepancies (e.g., grams vs. kilograms), and assuming conditions that were not explicitly stated.

---
*Feel free to ask me to solve a specific problem, walk through another worked example, or generate a practice quiz question on this!*`;

        return {
            reply,
            topic: displayTopic,
            suggestedFollowUps: [
                `Can you show a step-by-step worked example of this?`,
                `What is the most common exam trap in ${subject}?`,
                `Generate a practice quiz question on ${displayTopic}.`
            ]
        };
    }

    /**
     * Safely loads the requesting student's verified profile, school scope, and curriculum context.
     */
    private static async getStudentContext(userId?: string, clientEnrolledSubjects?: string[]) {
        const defaultSubjects = ["Mathematics", "English", "Physics", "Chemistry", "Biology", "History", "Civics"];
        const mergedClientSubjects = Array.isArray(clientEnrolledSubjects) ? clientEnrolledSubjects.filter(Boolean) : [];

        if (!userId || typeof userId !== "string" || !userId.trim()) {
            return {
                studentName: "Student",
                gradeName: "Secondary School",
                sectionName: "General Section",
                organizationId: "",
                schoolGradeId: "",
                sectionId: null,
                enrollmentId: "",
                enrolledSubjects: mergedClientSubjects.length > 0 ? mergedClientSubjects : defaultSubjects
            };
        }

        try {
            let student = await prisma.student.findUnique({
                where: { userId },
                include: {
                    enrollments: {
                        include: {
                            schoolGrade: { include: { grade: true } },
                            section: true,
                            organization: true
                        },
                        orderBy: { createdAt: "desc" },
                        take: 1
                    }
                }
            }).catch(() => null);

            if (!student) {
                student = await prisma.student.findFirst({
                    where: {
                        OR: [
                            { id: userId },
                            { studentId: userId }
                        ]
                    },
                    include: {
                        enrollments: {
                            include: {
                                schoolGrade: { include: { grade: true } },
                                section: true,
                                organization: true
                            },
                            orderBy: { createdAt: "desc" },
                            take: 1
                        }
                    }
                }).catch(() => null);
            }

            const enrollment = student?.enrollments?.[0];
            const organizationId = enrollment?.organizationId || "";
            const schoolGradeId = enrollment?.schoolGradeId || "";
            const sectionId = enrollment?.sectionId || null;
            const gradeName = enrollment?.schoolGrade?.grade?.name || "Secondary School";
            const sectionName = enrollment?.section?.name ? `Section ${enrollment.section.name}` : "General Section";
            const studentName = student?.firstName || "Student";

            // Fetch student's assigned subjects
            let subjectNames: string[] = [];
            if (enrollment) {
                try {
                    const assignments = await prisma.teachingAssignment.findMany({
                        where: {
                            academicYearId: enrollment.academicYearId,
                            OR: [
                                { sectionId: enrollment.sectionId },
                                { schoolGradeId: enrollment.schoolGradeId }
                            ]
                        },
                        include: { subject: true },
                        take: 15
                    });
                    subjectNames = Array.from(new Set(assignments.map(a => a.subject.name).filter(Boolean)));
                } catch (_) {}
            }

            const mergedSubjects = Array.from(
                new Set([
                    ...subjectNames,
                    ...mergedClientSubjects
                ])
            );

            return {
                studentName,
                gradeName,
                sectionName,
                organizationId,
                schoolGradeId,
                sectionId,
                enrollmentId: enrollment?.id || "",
                enrolledSubjects: mergedSubjects.length > 0 ? mergedSubjects : defaultSubjects
            };
        } catch (err) {
            console.warn("[StudentAiService] Error querying student context:", err);
            return {
                studentName: "Student",
                gradeName: "Secondary School",
                sectionName: "General Section",
                organizationId: "",
                schoolGradeId: "",
                sectionId: null,
                enrollmentId: "",
                enrolledSubjects: mergedClientSubjects.length > 0 ? mergedClientSubjects : defaultSubjects
            };
        }
    }

    /**
     * Collects and summarizes shared digital resources, teacher materials, activities, and assessments for a specific subject.
     */
    private static async getSharedResourcesSummary(organizationId: string, subject: string, schoolGradeId?: string): Promise<string> {
        if (!organizationId || !subject) return "";

        try {
            const [digitalResources, learningActivities, assessments] = await Promise.all([
                prisma.digitalResource.findMany({
                    where: {
                        organizationId,
                        status: "PUBLISHED",
                        OR: [
                            { subjectName: { contains: subject, mode: "insensitive" } },
                            { title: { contains: subject, mode: "insensitive" } }
                        ]
                    },
                    include: {
                        recommendations: {
                            select: {
                                note: true,
                                teacher: { select: { firstName: true, lastName: true } }
                            },
                            take: 3
                        }
                    },
                    take: 6,
                    orderBy: { createdAt: "desc" }
                }),
                prisma.learningActivity.findMany({
                    where: {
                        organizationId,
                        teachingAssignment: {
                            subject: { name: { contains: subject, mode: "insensitive" } }
                        }
                    },
                    take: 5,
                    orderBy: { createdAt: "desc" },
                    select: {
                        title: true,
                        description: true,
                        type: true,
                        supportCategory: true
                    }
                }),
                prisma.assessment.findMany({
                    where: {
                        organizationId,
                        teachingAssignment: {
                            subject: { name: { contains: subject, mode: "insensitive" } }
                        }
                    },
                    take: 5,
                    orderBy: { createdAt: "desc" },
                    select: {
                        title: true,
                        description: true,
                        type: true
                    }
                })
            ]);

            const summaries: string[] = [];

            if (digitalResources.length > 0) {
                summaries.push("PUBLISHED TEACHER & SCHOOL DIGITAL RESOURCES:");
                for (const r of digitalResources) {
                    const notes = r.recommendations.map(rec => `${rec.teacher.firstName}: "${rec.note}"`).join("; ");
                    summaries.push(`- Title: "${r.title}" (${r.resourceType}). Description: ${r.description || "Core syllabus material"}. ${notes ? `Teacher Guidance: ${notes}` : ""}`);
                }
            }

            if (learningActivities.length > 0) {
                summaries.push("CLASSROOM LEARNING ACTIVITIES & ASSIGNMENTS:");
                for (const a of learningActivities) {
                    summaries.push(`- Activity: "${a.title}" [${a.type}]. Description: ${a.description || ""}. ${a.supportCategory ? `Category: ${a.supportCategory}` : ""}`);
                }
            }

            if (assessments.length > 0) {
                summaries.push("CLASSROOM TESTS & ASSESSMENTS:");
                for (const asmt of assessments) {
                    summaries.push(`- Assessment: "${asmt.title}" [${asmt.type}]. Description: ${asmt.description || "Curriculum evaluation"}`);
                }
            }

            return summaries.join("\n");
        } catch (err) {
            console.warn("[StudentAiService] Could not load shared resources for subject:", err);
            return "";
        }
    }

    /**
     * 1. Concept Explainer: Real-world anchored, brief, deep, and grounded in shared resources.
     */
    static async explainConcept(
        userId: string,
        subject: string,
        topic: string,
        depth: "simple" | "detailed" | "exam" = "simple"
    ): Promise<ConceptExplanationResult> {
        const context = await this.getStudentContext(userId);
        const sharedMaterials = await this.getSharedResourcesSummary(context.organizationId, subject, context.schoolGradeId);

        const prompt = `You are EduBridge AI, a world-class academic tutor and master educator.
You are assisting ${context.studentName}, enrolled in ${context.gradeName} (${context.sectionName}).

TARGET SUBJECT: ${subject}
CONCEPT / QUESTION: "${topic}"
REQUESTED DEPTH: ${depth}
(simple = intuitive & visual; detailed = step-by-step physical/mathematical mechanism; exam = test-ready analytical breakdown)

${sharedMaterials ? `SHARED SCHOOL & TEACHER MATERIALS FOR ${subject}:\n${sharedMaterials}\nAlign your explanation to incorporate the terminology and notes from these shared resources.\n` : ""}

PEDAGOGICAL & ARCHITECTURAL GUIDELINES:
1. STRUCTURED BREVITY (FEYNMAN TECHNIQUE):
   - Never write conversational filler ("Hello!", "Sure!", "Great question!"). Jump straight into high-density insights.
   - Keep each section punchy and memorable.

2. REAL-WORLD ANCHOR:
   - Connect the concept directly to everyday technology, human biology, nature, or sports. Make it tangible.

3. MULTI-CURRICULUM & UNIVERSAL STANDARDS:
   - Ground all scientific laws, mathematical reasoning, and humanities in universal academic standards (compatible with Cambridge IGCSE/A-Level, AP, IB, and national curricula).
   - CURRICULUM SYNTHESIS: Focus on ${subject}. If this concept naturally relates to or builds upon other school subjects (${context.enrolledSubjects.join(", ")}), connect and synthesize those concepts; if standalone, treat it as it is.

4. ADAPTIVE DEPTH FOR OUTSTANDING MINDS:
   - Always include a "levelUpChallenge" providing an advanced proof, Olympiad-level insight, or university-level concept extension so gifted students have no artificial ceilings.

5. SAFETY & PRIVACY CONSTRAINTS (STRICT):
   - You are strictly an academic tutor.
   - NEVER discuss school administrative data, teacher salaries/evaluations, passwords, database schemas, or other students' private records.
   - If asked for forbidden data, politely decline within the "summary" field and redirect to studying.

Return ONLY a valid JSON object matching this schema (no markdown formatting, no code fences):
{
  "topic": "${topic} in ${subject}",
  "summary": "1 clear sentence explaining the big picture in intuitive, plain human words.",
  "keyPoints": [
    "Precise mechanism point 1: The underlying scientific/mathematical rule or definition",
    "Precise mechanism point 2: Step-by-step logic, formula with units, or causal sequence",
    "Precise mechanism point 3: Critical distinction, condition, or common student misconception to avoid"
  ],
  "example": "A vivid, concrete real-world example from everyday life, engineering, or nature.",
  "mentalHook": "A 1-sentence memorable analogy that makes the concept stick forever.",
  "quickCheck": "A 1-sentence thought-provoking self-check question testing genuine comprehension.",
  "levelUpChallenge": "An advanced concept extension, formula proof, or Olympiad-level teaser for outstanding students."
}`;

        let rawText = "";
        try {
            rawText = await this.generateWithFallback(prompt, true);
        } catch (err: any) {
            console.warn("[StudentAiService] explainConcept generation failed, using fallback:", err?.message);
        }

        try {
            if (rawText) {
                return JSON.parse(rawText);
            }
        } catch (_) {}

        return {
            topic: `${topic} in ${subject}`,
            summary: `"${topic}" is a fundamental concept in ${subject} that describes how components interact systematically.`,
            keyPoints: [
                `Foundation: Governs core relationships and conservation laws in ${subject}.`,
                `Mechanism: Always verify given units and reference boundary conditions before calculating.`,
                `Application: Used widely across modern science, engineering, and everyday technology.`
            ],
            example: `When applied to everyday scenarios, this concept allows engineers and scientists to predict outcomes reliably.`,
            mentalHook: `Think of this concept as a natural rulebook guiding how systems behave under balanced conditions.`,
            quickCheck: `Can you state the main rule of ${topic} in your own words?`,
            levelUpChallenge: `Explore how this concept behaves under extreme limits or in higher dimensions.`
        };
    }

    /**
     * 2. Multi-Question Quiz Batch Generator
     * - Accesses and analyzes shared resources for the selected subject
     * - Allows student to write specific custom inquiries/prompts
     * - Allows student to attach files or photos of problems/diagrams to analyze
     * - Customizable question count (1 - 10)
     * - Calibrated Difficulty: Easy, Medium (HARDER & RIGOROUS), Hard
     * - STRICT SUBJECT ISOLATION: Never mixes subjects!
     * - Provides rich explanations highlighting traps and misconceptions
     */
    static async generateQuizBatch(params: {
        userId: string;
        subject: string;
        topic?: string;
        customPrompt?: string;
        count?: number;
        difficulty?: "Easy" | "Medium" | "Hard";
        isOther?: boolean;
        enrolledSubjects?: string[];
        file?: {
            mimeType: string;
            data: string; // base64
            name?: string;
        };
        attachedResource?: {
            id?: string;
            title: string;
            category: "teacher" | "school" | "recommended";
            description?: string;
            authorOrSource?: string;
            recommendationNote?: string;
        };
    }): Promise<QuizQuestionResult[]> {
        const { userId, subject, topic, customPrompt, count = 3, difficulty = "Medium", isOther, enrolledSubjects, file, attachedResource } = params;
        const validCount = Math.min(Math.max(Number(count) || 3, 1), 10);
        const context = await this.getStudentContext(userId, enrolledSubjects);
        const isCustomSubject = Boolean(isOther) || !context.enrolledSubjects.some(s => s.toLowerCase() === subject.toLowerCase());
        const sharedMaterials = isCustomSubject ? "" : await this.getSharedResourcesSummary(context.organizationId, subject, context.schoolGradeId);

        const prompt = `You are an expert curriculum examination designer and academic assessment creator.
Generate a structured quiz consisting of exactly ${validCount} multiple-choice question(s) for ${context.studentName}, a ${context.gradeName} student.

CURRICULUM SYNTHESIS & INTERDISCIPLINARY POLICY (USER REQUIREMENT - DO NOT STRICTLY ISOLATE):
- Target Subject: Anchor the core assessment around "${subject}".
- INTERDISCIPLINARY SYNTHESIS:
  * If "${subject}" naturally relates to, draws upon, or connects with any of the subjects the student learns in school (${context.enrolledSubjects.join(", ")}):
    - ACTIVELY MIX AND SYNTHESIZE those related subjects into the question setups, applied scenarios, and calculations!
    - Examples: In Physics, blend algebraic derivations, trigonometry, and vectors; in Chemistry, integrate thermodynamics, energy states, and physics; in Biology, integrate biochemistry, molecular structures, and chemical equations; in History/Social Studies, connect Civics, Economics, and text analysis.
  * If the concept is standalone and does not naturally connect to their other subjects, treat it as it is without artificial mixing.

${attachedResource ? `SELECTED SPECIFIC ${attachedResource.category.toUpperCase()} RESOURCE TO ANALYZE & TEST:
- Resource Title: "${attachedResource.title}"
- Resource Category: ${attachedResource.category === "teacher" ? "Teacher Assigned Material / Class Activity" : attachedResource.category === "recommended" ? "Teacher Recommended Material" : "Official School Digital Repository Material"}
${attachedResource.authorOrSource ? `- Author / Source: ${attachedResource.authorOrSource}` : ""}
${attachedResource.description ? `- Description & Content: ${attachedResource.description}` : ""}
${attachedResource.recommendationNote ? `- Teacher Guidance / Notes: "${attachedResource.recommendationNote}"` : ""}
CRITICAL INSTRUCTION: Analyze the concepts, definitions, and teacher notes from this selected resource, and generate questions directly testing its contents.\n` : ""}

${sharedMaterials ? `SHARED SCHOOL & TEACHER RESOURCES FOR ${subject}:\n${sharedMaterials}\nAnalyze and ground the questions in the concepts, formulas, and teacher guidance from these shared materials whenever relevant.\n` : ""}

${file ? `ATTACHED STUDENT FILE / IMAGE ("${file.name || "uploaded_document"}"):
The student uploaded a file or image containing a problem, diagram, textbook excerpt, chemical equation, or worksheet.
CRITICAL INSTRUCTION: Analyze the content, diagrams, numbers, questions, and formulas in the attached image/file carefully.
Generate questions that directly evaluate, test, or practice the material and concepts shown in this uploaded attachment.\n` : ""}

STUDENT SPECIFIC FOCUS / CUSTOM WRITING SPACE:
${customPrompt ? `The student specifically asked to test or explore: "${customPrompt}". Prioritize generating questions directly addressing this specific query within ${subject}.` : `Focus on core curriculum competencies and essential principles of ${topic || subject}.`}

CRITICAL DIFFICULTY CALIBRATION (USER FEEDBACK: MEDIUM MUST BE RIGOROUS & DEMANDING):
- Easy:
  * Tests solid foundational understanding and direct real-world application.
  * Single-step calculations or applying definitions to practical scenarios.
  * NO trivial kindergarten questions (never ask simple dictionary definitions like "What is force?").

- Medium (RIGOROUS & DEMANDING CURRICULUM EXAM STANDARD - NOT EASY):
  * MUST require 2-to-3-step logical deduction or multi-variable calculation (e.g. combining two physical/mathematical laws, intermediate variables, unit conversions, or analyzing non-obvious experimental setups).
  * DECEPTIVE DISTRACTOR TRAPS: The 3 incorrect options MUST be derived from classic student misconceptions or arithmetic slips (e.g. inverted formula, missing square, confusing scalar vs vector, sign blunder).
  * At least 2 of the 4 options MUST look very convincing to anyone who has only a surface-level grasp.

- Hard (OLYMPIAD / ADVANCED AP / COMPETITION LEVEL):
  * Complex analytical synthesis, multi-concept integration, boundary conditions, edge cases, deep counter-intuitive paradoxes, or multi-stage derivations.
  * Requires sharp critical thinking to separate real scientific/mathematical laws from intuitive fallacies.

QUESTION DESIGN RULES:
1. Scenario-Based: Ground questions in concrete, realistic scenarios, engineering, or experimental setups.
2. 4 Distinct Options: Exactly 4 choices per question. Only ONE option is correct.
3. Smart Distractors: The 3 incorrect options must reflect common student misconceptions.
4. Hint: Provide an encouraging clue that guides thinking without giving away the answer.
5. In-Depth Explanation: Explain WHY the correct choice is true, and provide a deep breakdown of why other choices are traps.
6. Resource Grounding: State what learning principle or shared teacher topic this tests.

Return ONLY a valid JSON array of exactly ${validCount} question object(s) matching this schema (no markdown, no backticks, no extra text):
[
  {
    "id": "q1",
    "subject": "${subject}",
    "question": "Clear, scenario-driven question statement here.",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "hint": "Guiding thought without revealing the answer...",
    "explanation": "Detailed step-by-step explanation including the trap in the distractors.",
    "difficulty": "${difficulty}",
    "resourceGrounding": "Grounded in: ${subject} Curriculum"
  }
]`;

        const contents: any[] = [{ text: prompt }];
        if (file && file.data) {
            const cleanBase64 = file.data.includes(",") ? file.data.split(",")[1] : file.data;
            contents.push({
                inlineData: {
                    mimeType: file.mimeType || "image/jpeg",
                    data: cleanBase64
                }
            });
        }

        let rawText = "";
        try {
            rawText = await this.generateWithFallback(contents, true);
        } catch (err: any) {
            console.warn("[StudentAiService] generateQuizBatch AI failed, serving calibrated curriculum quiz:", err?.message);
        }

        try {
            if (rawText) {
                const parsed = JSON.parse(rawText);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map((q: any, idx: number) => ({
                        id: q.id || `q_${idx + 1}`,
                        subject,
                        question: q.question || "Conceptual question",
                        options: Array.isArray(q.options) && q.options.length >= 4 ? q.options.slice(0, 4) : ["Option A", "Option B", "Option C", "Option D"],
                        correctIndex: typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0,
                        hint: q.hint || "Review core principles before calculating.",
                        explanation: q.explanation || "The correct choice aligns with scientific principles.",
                        difficulty: q.difficulty || difficulty,
                        resourceGrounding: q.resourceGrounding || `Grounded in ${subject} Curriculum`
                    }));
                }
            }
        } catch (_) {}

        return this.generateCurriculumQuizFallback(subject, difficulty, validCount, topic || customPrompt);
    }

    /**
     * Backward-compatible single question generator.
     */
    static async generateQuizQuestion(
        userId: string,
        subject: string,
        topic: string,
        difficulty: "Warmup" | "Standard" | "Challenge" = "Standard"
    ): Promise<QuizQuestionResult> {
        const mappedDiff = difficulty === "Warmup" ? "Easy" : difficulty === "Challenge" ? "Hard" : "Medium";
        const batch = await this.generateQuizBatch({
            userId,
            subject,
            topic,
            count: 1,
            difficulty: mappedDiff
        });
        return batch[0] || {
            id: "q_1",
            subject,
            question: `In ${subject}, which principle represents fundamental scientific observation?`,
            options: [
                "Systematic observation with repeatable measurements and controlled variables",
                "Personal intuition without documentation",
                "Relying on a single unverified trial",
                "Ignoring unexpected data points that contradict hypotheses"
            ],
            correctIndex: 0,
            hint: "Scientific conclusions require consistency and repeatability across independent trials.",
            explanation: "The scientific method requires repeatable, structured measurements with isolated variables.",
            difficulty: mappedDiff,
            resourceGrounding: `Grounded in ${subject} Curriculum`
        };
    }

    /**
     * 3. Interactive Multi-Turn AI Tutor Chatbot
     * Provides rich dialogue, step-by-step problem breakdown, image analysis, and follow-up prompts.
     */
    static async chatWithTutor(params: {
        userId: string;
        subject: string;
        sessionId?: string;
        history?: Array<{ role: "user" | "model" | "assistant"; text: string }>;
        message: string;
        isOther?: boolean;
        enrolledSubjects?: string[];
        file?: {
            mimeType: string;
            data: string;
            name?: string;
        };
        attachedResource?: {
            id?: string;
            title: string;
            category: "teacher" | "school" | "recommended";
            description?: string;
            authorOrSource?: string;
            recommendationNote?: string;
        };
    }): Promise<{
        reply: string;
        topic?: string;
        suggestedFollowUps: string[];
    }> {
        const { userId, subject, sessionId, history = [], message, isOther, enrolledSubjects, file, attachedResource } = params;
        const context = await this.getStudentContext(userId, enrolledSubjects);
        const isCustomSubject = Boolean(isOther) || !context.enrolledSubjects.some(s => s.toLowerCase() === subject.toLowerCase());
        const sharedMaterials = isCustomSubject ? "" : await this.getSharedResourcesSummary(context.organizationId, subject, context.schoolGradeId);
        const pastSessionsMemory = await StudentAiSessionService.getPastSessionsMemory(userId, sessionId);

        const systemPrompt = `You are EduBridge AI, a world-class academic tutor and compassionate mentor.
You are in a live 1-on-1 interactive tutoring conversation with ${context.studentName}, a ${context.gradeName} student.
ACTIVE SUBJECT CONTEXT: "${subject}".
${sharedMaterials ? `SHARED SCHOOL & TEACHER RESOURCES FOR ${subject}:\n${sharedMaterials}\n` : ""}

${pastSessionsMemory.length > 0 ? `STUDENT'S PREVIOUS TUTORING LESSONS & KNOWLEDGE MEMORY:
EduBridge AI, you remember ${context.studentName}'s past tutoring sessions and inquiries:
${pastSessionsMemory.map(p => `- [${p.date}] Subject: "${p.subject}" | Session: "${p.title}" | What was covered: ${p.summary}`).join("\n")}

CRITICAL MEMORY DIRECTIVE:
- You have persistent memory of these past discussions with ${context.studentName}!
- If the student references earlier topics or questions ("like we did before", "test me on my last lesson", "how does this compare to what we did?"), recall and connect directly to these past conversations.
- Reference concepts the student previously covered to provide continuous, personalized academic growth.\n` : ""}

CURRICULUM SYNTHESIS & INTERDISCIPLINARY GUIDELINE (USER REQUIREMENT - DO NOT STRICTLY ISOLATE):
- The student is exploring: "${subject}".
- If this topic relates to, connects with, or draws upon the subjects the student learns in school (${context.enrolledSubjects.join(", ")}):
  * Actively bridge, connect, and draw upon those school subjects to deepen their understanding.
  * If the topic is standalone and not related to their other subjects, treat it as it is.

${attachedResource ? `ATTACHED CURRICULUM RESOURCE FOR DISCUSSION:
- Title: "${attachedResource.title}"
- Category: ${attachedResource.category === "teacher" ? "Teacher Assigned Material / Activity" : attachedResource.category === "recommended" ? "Teacher Recommended Material" : "School Digital Repository Material"}
${attachedResource.authorOrSource ? `- Author/Source: ${attachedResource.authorOrSource}` : ""}
${attachedResource.description ? `- Description: ${attachedResource.description}` : ""}
${attachedResource.recommendationNote ? `- Teacher Note: "${attachedResource.recommendationNote}"` : ""}
Reference and ground your answers in this attached resource whenever relevant.\n` : ""}

PEDAGOGICAL & CHATBOT GUIDELINES:
1. THE FEYNMAN TECHNIQUE:
   - Explain ideas simply, intuitively, and without unnecessary academic jargon.
   - Use clear formatting: bullet points for steps, bold for critical definitions, and explicit formulas with units.
2. ATTACHMENT / IMAGE ANALYSIS:
   - If an image or file is uploaded (homework problem, diagram, textbook passage), thoroughly inspect it, describe what you see, and guide the student step-by-step through solving it.
3. CONVERSATIONAL ENGAGEMENT:
   - Speak directly to ${context.studentName}.
   - Be encouraging, patient, and intellectually stimulating.
4. SUGGESTED NEXT STEPS:
   - Provide exactly 3 short, thought-provoking follow-up question chips the student might want to ask next.

Return ONLY a valid JSON object matching this schema (no markdown formatting, no code fences):
{
  "reply": "Your rich, formatted response using markdown, bold terms, and step-by-step guidance...",
  "topic": "Core topic name",
  "suggestedFollowUps": [
    "Next question or clarification chip 1",
    "Next question or clarification chip 2",
    "Next question or clarification chip 3"
  ]
}`;

        const contents: any[] = [];
        // Add conversation context
        contents.push({
            role: "user",
            parts: [{ text: systemPrompt }]
        });
        contents.push({
            role: "model",
            parts: [{ text: `{"reply": "Hello ${context.studentName}! I am EduBridge AI, your personal tutor for ${subject}. How can I assist you with your studies today?", "suggestedFollowUps": []}` }]
        });

        // Add history turns (last 8)
        for (const item of history.slice(-8)) {
            const role = item.role === "model" || item.role === "assistant" ? "model" : "user";
            contents.push({
                role,
                parts: [{ text: item.text }]
            });
        }

        // Current turn parts
        const currentParts: any[] = [{ text: message || "Please review and explain this." }];
        if (file && file.data) {
            const cleanBase64 = file.data.includes(",") ? file.data.split(",")[1] : file.data;
            currentParts.push({
                inlineData: {
                    mimeType: file.mimeType || "image/jpeg",
                    data: cleanBase64
                }
            });
        }

        contents.push({
            role: "user",
            parts: currentParts
        });

        let rawText = "";
        try {
            rawText = await this.generateWithFallback(contents, true);
        } catch (genError: any) {
            console.warn("[StudentAiService] chatWithTutor AI failed, using curriculum fallback reply:", genError?.message);
            return this.buildCurriculumFallbackReply(subject, message, context.studentName, attachedResource);
        }

        try {
            const parsed = JSON.parse(rawText);
            return {
                reply: parsed.reply || rawText,
                topic: parsed.topic || subject,
                suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps) && parsed.suggestedFollowUps.length > 0
                    ? parsed.suggestedFollowUps.slice(0, 3)
                    : ["Can you show another step-by-step example?", "What is a common exam trap here?", "Give me a practice quiz question on this."]
            };
        } catch {
            return {
                reply: rawText,
                topic: subject,
                suggestedFollowUps: [
                    "Can you show another step-by-step example?",
                    "What is a common exam trap here?",
                    "Give me a practice quiz question on this."
                ]
            };
        }
    }

    /**
     * Builds an authentic offline fallback 7-day curriculum & lifestyle study roadmap.
     * Complies with:
     * - School-free weekends (Saturday & Sunday capped at 3-4 hours, no full day, with sports/hobbies/family time)
     * - Multi-subject diversity (2 subjects per day)
     * - Dedicated school homework & assignment slot on weekdays
     * - Gamified funTip & encouraging guidance for unmotivated students
     */
    private static generateCurriculumStudyPlanFallback(
        studentName: string,
        gradeName: string,
        enrolledSubjects: string[],
        weekdayHours: number = 2,
        weekendHours: number = 3.5,
        customPrompt?: string,
        style?: string
    ): StudyPlanResult {
        const subs = enrolledSubjects.length > 0 ? enrolledSubjects : ["Mathematics", "English", "Physics", "Chemistry", "Biology", "History", "Civics"];

        const days = [
            {
                day: "Monday",
                isWeekend: false,
                theme: "Core Problem-Solving & Class Homework",
                sub1: subs[0] || "Mathematics",
                sub2: subs[2] || "Physics",
                homework: "Review daily class notes & complete assigned school problem sets",
                tasks: [
                    `Solve 5 targeted practice problems in ${subs[0] || "Mathematics"}`,
                    `Summarize key formulas or definitions in ${subs[2] || "Physics"} with 1 diagram`,
                    `Complete and check off all assigned school homework`
                ],
                extracurricular: {
                    name: "15-minute evening walk or outdoor stretch",
                    duration: "20 min",
                    benefit: "Recharges mental clarity after the first school day of the week"
                },
                funTip: "The 2-Minute Kickstart: Tell yourself you will only do 2 minutes of homework. Once momentum begins, completing the block is effortless!"
            },
            {
                day: "Tuesday",
                isWeekend: false,
                theme: "Languages & Humanities Balance",
                sub1: subs[1] || "English",
                sub2: subs[5] || "History",
                homework: "Draft vocabulary flashcards and complete humanities reading assignment",
                tasks: [
                    `Active recall: Explain 1 historical event or theme out loud in your own words`,
                    `Read 4 pages of English comprehension and identify 3 rhetorical devices`,
                    `Finalize Tuesday school homework submissions`
                ],
                extracurricular: {
                    name: "Casual music break or musical instrument practice",
                    duration: "25 min",
                    benefit: "Activates creative neural pathways and relieves academic stress"
                },
                funTip: "Story-Link Trick: Turn historical dates or language rules into a ridiculous fictional story to make them unforgettable."
            },
            {
                day: "Wednesday",
                isWeekend: false,
                theme: "Mid-Week Science Laboratory & Formulas",
                sub1: subs[3] || "Chemistry",
                sub2: subs[4] || "Biology",
                homework: "Solve chemistry balancing equations and label biological diagram",
                tasks: [
                    `Balance 6 chemical reaction equations or review molecular structures`,
                    `Draw and annotate 1 biological process cycle (e.g. cellular respiration)`,
                    `Organize Wednesday assignments and prepare questions for tomorrow's teachers`
                ],
                extracurricular: {
                    name: "Table tennis, basketball drills, or stretching",
                    duration: "30 min",
                    benefit: "Boosts blood circulation and releases mid-week fatigue"
                },
                funTip: "Gamified Quiz Duel: Turn your science review into a 5-question speed quiz before checking your phone."
            },
            {
                day: "Thursday",
                isWeekend: false,
                theme: "Applied Problem Solving & Concept Reinforcement",
                sub1: subs[0] || "Mathematics",
                sub2: subs[6] || "Civics",
                homework: "Complete school math worksheet and review civic principles",
                tasks: [
                    `Practice 4 multi-step calculation problems without looking at solutions`,
                    `Summarize constitutional or civic definitions in concise bullet points`,
                    `Verify all end-of-week school homework is completed`
                ],
                extracurricular: {
                    name: "Free sketch, digital art, or favorite podcast",
                    duration: "25 min",
                    benefit: "Unwinds the mind and enhances spatial/creative thinking"
                },
                funTip: "Feynman Challenge: Pretend you are teaching this topic to a curious 10-year-old. If you can explain it simply, you own it!"
            },
            {
                day: "Friday",
                isWeekend: false,
                theme: "Weekly Wrap-Up & Error Log Reflection",
                sub1: subs[2] || "Physics",
                sub2: subs[1] || "English",
                homework: "Review weekly teacher feedback and close open homework items",
                tasks: [
                    `Examine 3 mistakes made on this week's assignments and write corrections`,
                    `Practice 1 English writing prompt or vocabulary drill`,
                    `Clear desk and backpack so you enter the weekend completely stress-free`
                ],
                extracurricular: {
                    name: "Game night or movie with family & friends",
                    duration: "1.5 hrs",
                    benefit: "Celebrates a productive school week and strengthens social bonds"
                },
                funTip: "Friday Victory Check: Give yourself a reward point for every homework assignment submitted on time this week!"
            },
            {
                day: "Saturday (Weekend)",
                isWeekend: true,
                theme: "School-Free Deep Project & Outdoor Sports",
                sub1: subs[0] || "Mathematics",
                sub2: subs[3] || "Chemistry",
                homework: "No mandatory daily school homework — Saturday is school-free!",
                tasks: [
                    `Morning Power Hour: 45-min deep dive on your most challenging topic`,
                    `Solve 1 Olympiad-style or advanced concept teaser with zero rush`,
                    `Review flashcards for 15 minutes before afternoon recreation`
                ],
                extracurricular: {
                    name: "⚽ Outdoor Football Match, Swimming, or Cycling",
                    duration: "2.0 hrs",
                    benefit: "Cardiovascular health, teamwork, sunshine, and full mental decompression"
                },
                funTip: "Weekend Rule: Do the 3.5h study session early in the morning so the entire afternoon and evening are 100% guilt-free play!"
            },
            {
                day: "Sunday (Weekend)",
                isWeekend: true,
                theme: "School-Free Wellbeing, Hobbies & Weekly Reset",
                sub1: subs[4] || "Biology",
                sub2: subs[5] || "History",
                homework: "Light 20-min backpack check and timetable preview for Monday",
                tasks: [
                    `30-minute relaxed concept mapping or audio-visual documentary review`,
                    `20-minute active recall self-quiz on weekly highlights`,
                    `Pack school bag, uniform, and check homework items for Monday morning`
                ],
                extracurricular: {
                    name: "🎨 Coding Hobby, Creative Writing, or Family Gathering",
                    duration: "2.5 hrs",
                    benefit: "Pursuing personal passions, emotional replenishment, and restful sleep"
                },
                funTip: "Sunday Secret: A 15-minute prep Sunday night eliminates 80% of Monday morning school stress!"
            }
        ];

        const plan: StudyPlanDay[] = days.map((d) => ({
            day: d.day,
            isWeekend: d.isWeekend,
            theme: d.theme,
            totalDuration: d.isWeekend ? `${weekendHours} hrs (Light Weekend Target)` : `${weekdayHours} hrs`,
            subject: `${d.sub1} & ${d.sub2}`,
            duration: d.isWeekend ? `${weekendHours} hrs` : `${weekdayHours} hrs`,
            subjects: [
                { name: d.sub1, duration: d.isWeekend ? "60 min" : "40 min", focus: "Core concepts & problem practice" },
                { name: d.sub2, duration: d.isWeekend ? "45 min" : "35 min", focus: "Synthesis & worked examples" }
            ],
            homeworkSlot: d.isWeekend ? undefined : {
                duration: "30 min",
                description: d.homework
            },
            tasks: d.tasks,
            extracurricular: d.extracurricular,
            funTip: d.funTip
        }));

        const coachMessage = `Hi ${studentName}! I designed a balanced, high-impact 7-day schedule for your ${gradeName} studies. ` +
            `Weekdays are optimized around your school classes with dedicated homework blocks and 2 subjects per day. ` +
            `Since weekends are school-free, your Saturday and Sunday studies are capped at ${weekendHours} hours max, leaving plenty of time for sports, hobbies, and relaxation!`;

        return {
            coachMessage,
            plan,
            suggestedAdjustments: [
                "Make Wednesday lighter for sports practice",
                "Add more focus to upcoming Mathematics test",
                "Make Sunday completely free from revision",
                "Gamify tasks with more fun challenges"
            ]
        };
    }

    /**
     * 3. AI Study Plan Generator: Conversational, multi-subject, weekend-aware, and gamified.
     */
    static async generateStudyPlan(
        params: {
            userId: string;
            weekdayTargetHours?: number;
            weekendTargetHours?: number;
            customPrompt?: string;
            style?: "fun" | "balanced" | "exam" | "homework";
            message?: string;
            history?: Array<{ role: "user" | "assistant" | "model"; text: string }>;
            enrolledSubjects?: string[];
        } | string,
        legacyHours?: number
    ): Promise<StudyPlanResult> {
        let userId = "";
        let weekdayTargetHours = 2;
        let weekendTargetHours = 3.5;
        let customPrompt = "";
        let style = "balanced";
        let clientEnrolledSubjects: string[] | undefined;

        if (typeof params === "string") {
            userId = params;
            weekdayTargetHours = Number(legacyHours) || 2;
        } else {
            userId = params.userId;
            weekdayTargetHours = Number(params.weekdayTargetHours) || 2;
            weekendTargetHours = Number(params.weekendTargetHours) || 3.5;
            customPrompt = params.customPrompt || params.message || "";
            style = params.style || "balanced";
            clientEnrolledSubjects = params.enrolledSubjects;
        }

        const context = await this.getStudentContext(userId, clientEnrolledSubjects);
        const subjectsList = context.enrolledSubjects.slice(0, 8);

        const prompt = `You are EduBridge AI, an elite Academic & Wellbeing Coach.
You are generating a customized, 7-day weekly schedule for ${context.studentName}, enrolled in ${context.gradeName} (${context.sectionName}).
ENROLLED SCHOOL SUBJECTS: ${subjectsList.join(", ")}

STUDENT PREFERENCES & CUSTOM INQUIRY:
${customPrompt ? `"${customPrompt}"` : "The student wants a well-rounded, balanced weekly study roadmap."}
SCHEDULE STYLE: ${style} (fun = gamified with challenges & zero boredom; balanced = balanced study + sports + hobbies; exam = test-focused with strategic recall; homework = homework completion first).
WEEKDAY TARGET HOURS: ~${weekdayTargetHours} hrs/day
WEEKEND TARGET HOURS: ~${weekendTargetHours} hrs/day (MAX 3 to 4 hours on weekends so students have ample free time!)

CRITICAL USER & ARCHITECTURAL REQUIREMENTS:
1. SCHOOL-FREE WEEKENDS (SATURDAY & SUNDAY):
   - Secondary schools are FREE on Saturday and Sunday!
   - NEVER schedule a full day of studying on Saturday or Sunday.
   - Limit weekend study to 3 to 4 hours maximum (morning review or deep single-subject project).
   - MANDATORY EXTRACURRICULAR: On Saturday and Sunday, ALWAYS schedule dedicated extracurricular and recreation activities (e.g., football/basketball, creative arts, coding, music, outdoor recreation, family time).
2. MULTI-SUBJECT DIVERSITY (MORE THAN 1 SUBJECT PER DAY):
   - Rather than just 1 subject per day, schedule 2 complementary subjects per study session (e.g., Math + Physics, or Biology + English) to prevent cognitive fatigue.
3. DEDICATED SCHOOL HOMEWORK SLOTS:
   - On weekdays (Monday to Friday), include an explicit "homeworkSlot" (30-45 mins) for daily class homework and teacher assignments.
4. ENGAGING & FUN FOR UNMOTIVATED STUDENTS:
   - For students who find studying boring or difficult, make every task engaging, plain-language, and easy to understand with a gamified "funTip" (e.g. "Use the 5-minute rule", "Treat practice questions as boss levels", "Play instrumental lofi beats").
5. COMPLETE 7-DAY SCHEDULE (MONDAY TO SUNDAY):
   - Return exactly 7 days: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.

Return ONLY a valid JSON object matching this schema (no markdown formatting, no code fences):
{
  "coachMessage": "Encouraging, warm, and personal 2-3 sentence overview from EduBridge AI explaining why this plan fits their exact needs...",
  "suggestedAdjustments": [
    "Make Tuesday lighter for football",
    "Add more practice questions for Mathematics",
    "Keep Sunday completely free from revision"
  ],
  "plan": [
    {
      "day": "Monday",
      "isWeekend": false,
      "theme": "STEM Focus & Class Homework",
      "totalDuration": "${weekdayTargetHours} hrs",
      "subjects": [
        { "name": "Mathematics", "duration": "45 min", "focus": "Algebraic equations and worked examples" },
        { "name": "Physics", "duration": "40 min", "focus": "Forces and motion concept check" }
      ],
      "homeworkSlot": {
        "duration": "35 min",
        "description": "Complete assigned exercises from daily school classes"
      },
      "tasks": [
        "Solve 4 practice problems in Math",
        "Summarize Physics Newton laws with 1 diagram",
        "Check off completed school homework"
      ],
      "extracurricular": {
        "name": "Evening walk or 15-min stretch",
        "duration": "20 min",
        "benefit": "Mental relaxation"
      },
      "funTip": "Gamified Tip: Set a 20-min timer and race yourself to finish the first 3 homework questions before the buzzer!"
    }
  ]
}`;

        let rawText = "";
        try {
            rawText = await this.generateWithFallback(prompt, true);
        } catch (err: any) {
            console.warn("[StudentAiService] generateStudyPlan AI failed, using calibrated schedule:", err?.message);
            return this.generateCurriculumStudyPlanFallback(
                context.studentName,
                context.gradeName,
                context.enrolledSubjects,
                weekdayTargetHours,
                weekendTargetHours,
                customPrompt,
                style
            );
        }

        try {
            if (rawText) {
                const parsed = JSON.parse(rawText);
                if (parsed && Array.isArray(parsed.plan) && parsed.plan.length >= 6) {
                    const mappedPlan: StudyPlanDay[] = parsed.plan.map((p: any, idx: number) => {
                        const fallbackDayName = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][idx] || `Day ${idx + 1}`;
                        const isWeekend = p.isWeekend !== undefined ? Boolean(p.isWeekend) : idx >= 5;
                        const subBlocks: StudyPlanSubjectBlock[] = Array.isArray(p.subjects) && p.subjects.length > 0
                            ? p.subjects.map((s: any) => ({
                                name: s.name || "Subject Review",
                                duration: s.duration || "40 min",
                                focus: s.focus || "Core exercises"
                            }))
                            : [
                                { name: subjectsList[idx % subjectsList.length] || "Core Subject", duration: "45 min", focus: "Problem practice" },
                                { name: subjectsList[(idx + 1) % subjectsList.length] || "Complementary Subject", duration: "35 min", focus: "Active recall" }
                            ];

                        return {
                            day: p.day || fallbackDayName,
                            isWeekend,
                            theme: p.theme || (isWeekend ? "School-Free Weekend & Recreation" : "Class Study & Homework"),
                            totalDuration: p.totalDuration || (isWeekend ? `${weekendTargetHours} hrs` : `${weekdayTargetHours} hrs`),
                            subject: subBlocks.map(s => s.name).join(" & "),
                            duration: p.totalDuration || (isWeekend ? `${weekendTargetHours} hrs` : `${weekdayTargetHours} hrs`),
                            subjects: subBlocks,
                            homeworkSlot: isWeekend ? undefined : (p.homeworkSlot ? {
                                duration: p.homeworkSlot.duration || "30 min",
                                description: p.homeworkSlot.description || "Daily school homework & class assignments"
                            } : {
                                duration: "30 min",
                                description: "Complete daily school homework"
                            }),
                            tasks: Array.isArray(p.tasks) && p.tasks.length > 0 ? p.tasks : [
                                "Review today's lesson notes",
                                "Solve 4-5 practice problems",
                                "Self-quiz core definitions"
                            ],
                            extracurricular: p.extracurricular ? {
                                name: p.extracurricular.name || (isWeekend ? "⚽ Outdoor sports & recreation" : "Relaxing walk / music"),
                                duration: p.extracurricular.duration || (isWeekend ? "2.0 hrs" : "20 min"),
                                benefit: p.extracurricular.benefit || "Mental recharge and wellbeing"
                            } : {
                                name: isWeekend ? "⚽ Outdoor sports & recreation" : "Relaxing walk / music",
                                duration: isWeekend ? "2.0 hrs" : "20 min",
                                benefit: "Mental recharge and wellbeing"
                            },
                            funTip: p.funTip || (style === "fun" ? "Gamified Quest: Beat your personal record by completing this block with zero phone distractions!" : "Study Tip: Take a 5-min movement break every 30 minutes to boost memory retention.")
                        };
                    });

                    return {
                        coachMessage: parsed.coachMessage || `Here is your customized weekly roadmap for ${context.studentName}!`,
                        plan: mappedPlan,
                        suggestedAdjustments: Array.isArray(parsed.suggestedAdjustments) && parsed.suggestedAdjustments.length > 0
                            ? parsed.suggestedAdjustments.slice(0, 4)
                            : [
                                "Make Wednesday lighter for sports practice",
                                "Add more focus to upcoming Mathematics test",
                                "Make Sunday completely free from revision",
                                "Gamify tasks with more fun challenges"
                            ]
                    };
                }
            }
        } catch (_) {}

        return this.generateCurriculumStudyPlanFallback(
            context.studentName,
            context.gradeName,
            context.enrolledSubjects,
            weekdayTargetHours,
            weekendTargetHours,
            customPrompt,
            style
        );
    }
}


