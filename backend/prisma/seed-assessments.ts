import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    console.log("Seeding real-world assessments and student results...");

    const organizationId = "cmsrmaa6g000175qstx9zadrb"; // EduBridge Demo School
    const academicYearId = "cmt2mr4y300008gnwifeqpio3"; // Current Academic Year
    const schoolGradeId = "cmt2mr4z800038gnwx98fiwx4";   // Grade 9
    const sectionId = "cmt2mr4zo00058gnwl6vmdmt1";       // Section 9A
    const mathSubjectId = "cmt2mr50400078gnwy3sj7zwg";   // Mathematics
    const engSubjectId = "cmt2mr50900088gnw4rzyw9xu";    // English
    const teacherId = "cmtoq3fp100016mpvmln0p9bf";       // Selam Abebe
    const teacherUserId = "xWrffhpwgaOcQaCzsgMDKAVN9GzUnhOl"; // Selam Abebe (User)
    const enrollmentId = "cmu2wxb6o00026lpati0jbs7e";    // Student Sosina's enrollment

    // 1. Ensure English Teaching Assignment exists for Section 9A
    const engAssignmentId = "ta_sec_eng_selam";
    await prisma.teachingAssignment.upsert({
        where: { id: engAssignmentId },
        update: {},
        create: {
            id: engAssignmentId,
            teacherId,
            academicYearId,
            subjectId: engSubjectId,
            schoolGradeId,
            sectionId,
            periodsPerWeek: 5,
            status: "APPROVED" as any
        }
    });
    console.log("✓ English Teaching Assignment verified");

    // 2. Define Real-World Assessments
    const mathAssignmentId = "ta_sec_math_selam";
    const now = new Date();

    const assessmentsData = [
        {
            id: "asm_math_quiz_1",
            title: "Quiz 1: Coordinate Geometry & Function Graphs",
            description: "Covers Cartesian coordinates, distance formula, slope-intercept equations, and basic relations.",
            type: "QUIZ" as const,
            status: "CLOSED" as const,
            teachingAssignmentId: mathAssignmentId,
            durationMinutes: 30,
            scheduledDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
            dueDate: new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000),
            releasedAt: new Date(now.getTime() - 26 * 24 * 60 * 60 * 1000),
            closedAt: new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000),
            maxScore: 20,
            passingScore: 12,
            result: {
                score: 18.5,
                status: "GRADED",
                startedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
                submittedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000),
                feedback: "Very thorough understanding of slope calculation and linear functions. Keep it up!",
                gradedById: teacherUserId
            }
        },
        {
            id: "asm_math_quiz_2",
            title: "Quiz 2: Polynomial Expressions & Factoring",
            description: "Factoring quadratic trinomials, difference of squares, grouping, and remainder theorem.",
            type: "QUIZ" as const,
            status: "CLOSED" as const,
            teachingAssignmentId: mathAssignmentId,
            durationMinutes: 35,
            scheduledDate: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
            dueDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
            releasedAt: new Date(now.getTime() - 17 * 24 * 60 * 60 * 1000),
            closedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
            maxScore: 25,
            passingScore: 15,
            result: {
                score: 23,
                status: "GRADED",
                startedAt: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
                submittedAt: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
                feedback: "Excellent factorization on question 4. Minor sign error on the cubic expansion.",
                gradedById: teacherUserId
            }
        },
        {
            id: "asm_math_midterm",
            title: "Mathematics Midterm Examination (Term 1)",
            description: "Comprehensive mid-semester evaluation covering coordinate geometry, polynomial factoring, and linear systems.",
            type: "EXAM" as const,
            status: "CLOSED" as const,
            teachingAssignmentId: mathAssignmentId,
            durationMinutes: 90,
            scheduledDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
            dueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            releasedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
            closedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            maxScore: 100,
            passingScore: 60,
            result: {
                score: 92,
                status: "GRADED",
                startedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
                submittedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000),
                feedback: "Superb analytical proof structure and clear step-by-step problem derivations. Grade: A.",
                gradedById: teacherUserId
            }
        },
        {
            id: "asm_eng_essay",
            title: "English Essay & Vocabulary Analysis",
            description: "Critical commentary on literary passages and thematic analysis of character development.",
            type: "ASSIGNMENT" as const,
            status: "CLOSED" as const,
            teachingAssignmentId: engAssignmentId,
            durationMinutes: 60,
            scheduledDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
            dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
            releasedAt: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
            closedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
            maxScore: 30,
            passingScore: 18,
            result: {
                score: 27,
                status: "GRADED",
                startedAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000),
                submittedAt: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
                feedback: "Well-crafted arguments with cohesive transitions. Impressive command of vocabulary.",
                gradedById: teacherUserId
            }
        },
        {
            id: "asm_eng_midterm",
            title: "English Term 1 Mid-Semester Examination",
            description: "Grammar conventions, reading comprehension passage, sentence restructuring, and formal composition.",
            type: "EXAM" as const,
            status: "CLOSED" as const,
            teachingAssignmentId: engAssignmentId,
            durationMinutes: 90,
            scheduledDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            dueDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
            releasedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
            closedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
            maxScore: 100,
            passingScore: 60,
            result: {
                score: 88,
                status: "GRADED",
                startedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
                submittedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 + 70 * 60 * 1000),
                feedback: "Strong reading comprehension responses. Minor punctuation revisions needed on section 3.",
                gradedById: teacherUserId
            }
        },
        // Active / Open test that student can take right now
        {
            id: "asm_math_quiz_3",
            title: "Quiz 3: Quadratic Functions & Parabolic Modeling",
            description: "Interactive online quiz testing vertex formulas, axis of symmetry, finding real roots, and projectile trajectories.",
            type: "QUIZ" as const,
            status: "RELEASED" as const,
            teachingAssignmentId: mathAssignmentId,
            durationMinutes: 45,
            scheduledDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
            dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
            releasedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
            closedAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
            maxScore: 25,
            passingScore: 15,
            result: null // Not yet submitted - student can start or submit!
        },
        // Upcoming test next week
        {
            id: "asm_math_project_1",
            title: "Applied Trigonometry & Structural Survey Project",
            description: "Field application project measuring heights using clinometer data and sine/cosine ratios.",
            type: "PROJECT" as const,
            status: "SCHEDULED" as const,
            teachingAssignmentId: mathAssignmentId,
            durationMinutes: 120,
            scheduledDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
            releasedAt: null,
            closedAt: null,
            maxScore: 40,
            passingScore: 24,
            result: null
        },
        // Upcoming Final Exam
        {
            id: "asm_math_final",
            title: "Grade 9 Mathematics Final Examination",
            description: "Comprehensive end-of-term assessment covering the full Ethiopian national Grade 9 mathematics curriculum.",
            type: "EXAM" as const,
            status: "SCHEDULED" as const,
            teachingAssignmentId: mathAssignmentId,
            durationMinutes: 120,
            scheduledDate: new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000),
            dueDate: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
            releasedAt: null,
            closedAt: null,
            maxScore: 100,
            passingScore: 60,
            result: null
        }
    ];

    for (const item of assessmentsData) {
        const { result, ...assessmentFields } = item;

        await prisma.assessment.upsert({
            where: { id: assessmentFields.id },
            update: {
                ...assessmentFields,
                organizationId,
                academicYearId
            },
            create: {
                ...assessmentFields,
                organizationId,
                academicYearId
            }
        });

        if (result) {
            await prisma.studentResult.upsert({
                where: {
                    assessmentId_enrollmentId: {
                        assessmentId: assessmentFields.id,
                        enrollmentId
                    }
                },
                update: {
                    score: result.score,
                    status: result.status,
                    startedAt: result.startedAt,
                    submittedAt: result.submittedAt,
                    feedback: result.feedback,
                    gradedById: result.gradedById
                },
                create: {
                    assessmentId: assessmentFields.id,
                    enrollmentId,
                    score: result.score,
                    status: result.status,
                    startedAt: result.startedAt,
                    submittedAt: result.submittedAt,
                    feedback: result.feedback,
                    gradedById: result.gradedById
                }
            });
        }
    }

    console.log("✓ Seeded 8 curriculum assessments with graded results and teacher feedback!");
}

main()
    .catch((e) => {
        console.error("Seed error:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
