import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
  console.log("Seeding assessments for Haile mariam mamo (Active Organization)...");

  const organizationId = "cmv7z4nva0005ninyf66tc483";
  const academicYearId = "cmv7zidsp000aninycl3m9wsf";
  const schoolGradeId = "cmv7zj9in000cninyjzkfhvj7";
  const sectionId = "cmv7zj9k4000dninyk3ni99j7";
  const enrollmentId = "cmv80qve90003rbnyht90kr3t";

  const teacherId = "cmv80wqwo000arbnytyfewjie"; // Sosina Belay
  const teacherUserId = "uywiEaNvOZlVuDwIbXtT2XLbT4GM016D"; // User ID of Sosina Belay

  const mathSubjectId = "cmv7zjpo4000fninyr0xibdvo"; // Mathematics
  const engSubjectId = "cmv7zk2em000ininy0bih015c";  // English
  const sciSubjectId = "cmv7zk7uu000lninynpha6zld";  // General Science

  // 1. Ensure Teaching Assignments exist
  const mathTaId = "ta_hmm_math_secA";
  await prisma.teachingAssignment.upsert({
    where: { id: mathTaId },
    update: {},
    create: {
      id: mathTaId,
      teacherId,
      academicYearId,
      subjectId: mathSubjectId,
      schoolGradeId,
      sectionId,
      periodsPerWeek: 5,
      status: "APPROVED" as any
    }
  });

  const engTaId = "cmv80xdrv000drbnybnibuodo"; // existing English assignment
  await prisma.teachingAssignment.update({
    where: { id: engTaId },
    data: { status: "APPROVED" as any }
  }).catch(() => {});

  const sciTaId = "ta_hmm_sci_secA";
  await prisma.teachingAssignment.upsert({
    where: { id: sciTaId },
    update: {},
    create: {
      id: sciTaId,
      teacherId,
      academicYearId,
      subjectId: sciSubjectId,
      schoolGradeId,
      sectionId,
      periodsPerWeek: 4,
      status: "APPROVED" as any
    }
  });

  console.log("✓ Verified Teaching Assignments for Math, English, and Science");

  const now = new Date();

  // 2. Define Assessments
  const assessments = [
    {
      id: "hmm_asm_math_q1",
      teachingAssignmentId: mathTaId,
      title: "Quiz 1: Decimals, Fractions & Number Theory",
      description: "Covers conversion of mixed numbers to improper fractions, decimal place values, and LCM/GCF problem sets.",
      type: "QUIZ" as const,
      status: "CLOSED" as const,
      durationMinutes: 30,
      scheduledDate: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 24 * 24 * 60 * 60 * 1000),
      maxScore: 20,
      passingScore: 12,
      result: {
        score: 18.5,
        status: "GRADED",
        startedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000 + 25 * 60 * 1000),
        feedback: "Excellent precision on decimal operations and fraction conversions! Neat step-by-step working.",
        gradedById: teacherUserId
      }
    },
    {
      id: "hmm_asm_math_midterm",
      teachingAssignmentId: mathTaId,
      title: "Mathematics Midterm Examination (Term 1)",
      description: "Comprehensive mid-semester examination evaluating foundational arithmetic, word problems, and geometric angles.",
      type: "EXAM" as const,
      status: "CLOSED" as const,
      durationMinutes: 90,
      scheduledDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
      maxScore: 100,
      passingScore: 50,
      result: {
        score: 91,
        status: "GRADED",
        startedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000 + 75 * 60 * 1000),
        feedback: "Outstanding score. Clear logical proof steps on Section B word problems. Keep up the high standard!",
        gradedById: teacherUserId
      }
    },
    {
      id: "hmm_asm_eng_diag",
      teachingAssignmentId: engTaId,
      title: "Reading Comprehension & Vocabulary Diagnostic",
      description: "Short passage reading analysis, context clues, parts of speech, and sentence construction mechanics.",
      type: "QUIZ" as const,
      status: "CLOSED" as const,
      durationMinutes: 35,
      scheduledDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000),
      maxScore: 25,
      passingScore: 15,
      result: {
        score: 23,
        status: "GRADED",
        startedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        feedback: "Great vocabulary recall and strong textual evidence in answering interpretive questions.",
        gradedById: teacherUserId
      }
    },
    {
      id: "hmm_asm_eng_essay",
      teachingAssignmentId: engTaId,
      title: "Descriptive Essay: Ethiopian Cultural Heritage",
      description: "Structured three-paragraph descriptive essay highlighting local traditions, festivals, and national landmarks.",
      type: "ASSIGNMENT" as const,
      status: "CLOSED" as const,
      durationMinutes: 60,
      scheduledDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      maxScore: 30,
      passingScore: 18,
      result: {
        score: 27,
        status: "GRADED",
        startedAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        feedback: "Expressive prose with rich adjectives and accurate punctuation. Demonstrates commendable writing maturity.",
        gradedById: teacherUserId
      }
    },
    {
      id: "hmm_asm_sci_lab",
      teachingAssignmentId: sciTaId,
      title: "Ecosystems & Plant Photosynthesis Lab Report",
      description: "Documented observation of leaf stomata under microscope and diagrammatic classification of local plant species.",
      type: "PROJECT" as const,
      status: "CLOSED" as const,
      durationMinutes: 120,
      scheduledDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      maxScore: 50,
      passingScore: 30,
      result: {
        score: 46,
        status: "GRADED",
        startedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        submittedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        feedback: "Exceptional lab drawings and concise explanations of light-dependent reactions in chloroplasts.",
        gradedById: teacherUserId
      }
    },
    // ACTIVE ASSESSMENT: Ready to be taken & submitted online!
    {
      id: "hmm_asm_math_q2_active",
      teachingAssignmentId: mathTaId,
      title: "Quiz 2: Algebraic Expressions & Geometric Perimeters",
      description: "Evaluate 10 interactive algebra questions on simplifying like terms, finding area of compound shapes, and solving single-variable equations.",
      type: "QUIZ" as const,
      status: "RELEASED" as const,
      durationMinutes: 45,
      scheduledDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      maxScore: 25,
      passingScore: 15,
      result: null // Not submitted yet - interactive take/submit!
    },
    // UPCOMING ASSESSMENTS
    {
      id: "hmm_asm_eng_midterm_upcoming",
      teachingAssignmentId: engTaId,
      title: "English Term 1 Mid-Semester Examination",
      description: "Formal paper test covering listening, reading, grammar syntax, and comparative paragraph writing.",
      type: "EXAM" as const,
      status: "SCHEDULED" as const,
      durationMinutes: 80,
      scheduledDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      maxScore: 100,
      passingScore: 50,
      result: null
    },
    {
      id: "hmm_asm_sci_term_final",
      teachingAssignmentId: sciTaId,
      title: "General Science Term 1 Final Practical Evaluation",
      description: "Hands-on assessment assessing simple circuits, density measurements, and state transitions of matter.",
      type: "EXAM" as const,
      status: "SCHEDULED" as const,
      durationMinutes: 90,
      scheduledDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      maxScore: 100,
      passingScore: 50,
      result: null
    }
  ];

  for (const asst of assessments) {
    const { result, ...asstFields } = asst;
    await prisma.assessment.upsert({
      where: { id: asst.id },
      update: {
        title: asstFields.title,
        description: asstFields.description,
        type: asstFields.type,
        status: asstFields.status,
        durationMinutes: asstFields.durationMinutes,
        scheduledDate: asstFields.scheduledDate,
        dueDate: asstFields.dueDate,
        maxScore: asstFields.maxScore,
        passingScore: asstFields.passingScore
      },
      create: {
        id: asst.id,
        organizationId,
        academicYearId,
        teachingAssignmentId: asstFields.teachingAssignmentId,
        title: asstFields.title,
        description: asstFields.description,
        type: asstFields.type,
        status: asstFields.status,
        durationMinutes: asstFields.durationMinutes,
        scheduledDate: asstFields.scheduledDate,
        dueDate: asstFields.dueDate,
        maxScore: asstFields.maxScore,
        passingScore: asstFields.passingScore
      }
    });

    if (result) {
      await prisma.studentResult.upsert({
        where: {
          assessmentId_enrollmentId: {
            assessmentId: asst.id,
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
          assessmentId: asst.id,
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
    console.log(`✓ Processed assessment: ${asst.title}`);
  }

  console.log("\n✅ Successfully seeded Haile mariam mamo assessments and student results!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
