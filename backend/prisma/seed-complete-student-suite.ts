import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
  console.log("Seeding complete real curriculum data for active student & school...");

  const organizationId = "cmv7z4nva0005ninyf66tc483"; // Haile mariam mamo
  const orgId = organizationId;
  const academicYearId = "cmv7zidsp000aninycl3m9wsf"; // 2026
  const schoolGradeId = "cmv7zj9in000cninyjzkfhvj7"; // Grade 5
  const sectionId = "cmv7zj9k4000dninyk3ni99j7"; // Section A
  const enrollmentId = "cmv80qve90003rbnyht90kr3t"; // Arsema Keke Tad
  const teacherId = "cmv80wqwo000arbnytyfewjie"; // Sosina Belay
  const teacherUserId = "uywiEaNvOZlVuDwIbXtT2XLbT4GM016D"; // User ID of Sosina Belay

  const studentUser = await prisma.user.findFirst({
    where: { email: "stu.2026.0055@edubridge.local" }
  });
  if (!studentUser) throw new Error("Student user stu.2026.0055@edubridge.local not found");

  // 1. Subjects & Teaching Assignments
  const mathSubjectId = "cmv7zjpo4000fninyr0xibdvo"; // Mathematics
  const engSubjectId = "cmv7zk2em000ininy0bih015c";  // English
  const sciSubjectId = "cmv7zk7uu000lninynpha6zld";  // General Science
  const amhSubjectId = "cmv7zke8j000oninyqhdtjknb";  // Amharic
  const civSubjectId = "cmv7zmv6m000uninyxr9ahwir";  // Civics

  const teachingAssignments = [
    { id: "ta_hmm_math_secA", subjectId: mathSubjectId, periods: 5 },
    { id: "cmv80xdrv000drbnybnibuodo", subjectId: engSubjectId, periods: 5 },
    { id: "ta_hmm_sci_secA", subjectId: sciSubjectId, periods: 4 },
    { id: "ta_hmm_amh_secA", subjectId: amhSubjectId, periods: 4 },
    { id: "ta_hmm_civ_secA", subjectId: civSubjectId, periods: 3 },
  ];

  for (const ta of teachingAssignments) {
    await prisma.teachingAssignment.upsert({
      where: { id: ta.id },
      update: { status: "APPROVED" as any, periodsPerWeek: ta.periods },
      create: {
        id: ta.id,
        teacherId,
        academicYearId,
        subjectId: ta.subjectId,
        schoolGradeId,
        sectionId,
        periodsPerWeek: ta.periods,
        status: "APPROVED" as any
      }
    });
  }
  console.log("✓ Teaching assignments synced");

  // 2. Class Periods
  const periodDefs = [
    { id: "period_hmm_1", name: "Period 1", startTime: "08:30", endTime: "09:15" },
    { id: "period_hmm_2", name: "Period 2", startTime: "09:20", endTime: "10:05" },
    { id: "period_hmm_3", name: "Period 3", startTime: "10:20", endTime: "11:05" },
    { id: "period_hmm_4", name: "Period 4", startTime: "11:10", endTime: "11:55" },
    { id: "period_hmm_5", name: "Period 5", startTime: "13:00", endTime: "13:45" },
  ];

  for (const p of periodDefs) {
    await prisma.classPeriod.upsert({
      where: { id: p.id },
      update: { name: p.name, startTime: p.startTime, endTime: p.endTime },
      create: {
        id: p.id,
        organizationId,
        name: p.name,
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: false
      }
    });
  }
  console.log("✓ Class periods synced");

  // 3. Timetable (Weekly Schedule Mon-Fri)
  const scheduleMatrix = [
    // Monday (1)
    { day: 1, periodId: "period_hmm_1", taId: "ta_hmm_math_secA" },
    { day: 1, periodId: "period_hmm_2", taId: "cmv80xdrv000drbnybnibuodo" },
    { day: 1, periodId: "period_hmm_3", taId: "ta_hmm_sci_secA" },
    { day: 1, periodId: "period_hmm_4", taId: "ta_hmm_amh_secA" },
    { day: 1, periodId: "period_hmm_5", taId: "ta_hmm_civ_secA" },
    // Tuesday (2)
    { day: 2, periodId: "period_hmm_1", taId: "cmv80xdrv000drbnybnibuodo" },
    { day: 2, periodId: "period_hmm_2", taId: "ta_hmm_math_secA" },
    { day: 2, periodId: "period_hmm_3", taId: "ta_hmm_sci_secA" },
    { day: 2, periodId: "period_hmm_4", taId: "ta_hmm_amh_secA" },
    // Wednesday (3)
    { day: 3, periodId: "period_hmm_1", taId: "ta_hmm_math_secA" },
    { day: 3, periodId: "period_hmm_2", taId: "ta_hmm_sci_secA" },
    { day: 3, periodId: "period_hmm_3", taId: "cmv80xdrv000drbnybnibuodo" },
    { day: 3, periodId: "period_hmm_4", taId: "ta_hmm_civ_secA" },
    // Thursday (4)
    { day: 4, periodId: "period_hmm_1", taId: "ta_hmm_amh_secA" },
    { day: 4, periodId: "period_hmm_2", taId: "ta_hmm_math_secA" },
    { day: 4, periodId: "period_hmm_3", taId: "cmv80xdrv000drbnybnibuodo" },
    { day: 4, periodId: "period_hmm_4", taId: "ta_hmm_sci_secA" },
    // Friday (5)
    { day: 5, periodId: "period_hmm_1", taId: "cmv80xdrv000drbnybnibuodo" },
    { day: 5, periodId: "period_hmm_2", taId: "ta_hmm_math_secA" },
    { day: 5, periodId: "period_hmm_3", taId: "ta_hmm_amh_secA" },
    { day: 5, periodId: "period_hmm_4", taId: "ta_hmm_civ_secA" },
  ];

  for (let i = 0; i < scheduleMatrix.length; i++) {
    const s = scheduleMatrix[i];
    const timetableId = `tt_hmm_${s.day}_${s.periodId}`;
    await prisma.timetable.upsert({
      where: { id: timetableId },
      update: {
        dayOfWeek: s.day,
        classPeriodId: s.periodId,
        teachingAssignmentId: s.taId
      },
      create: {
        id: timetableId,
        organizationId,
        academicYearId,
        teachingAssignmentId: s.taId,
        classPeriodId: s.periodId,
        dayOfWeek: s.day
      }
    });
  }
  console.log("✓ Full weekly timetable synced (21 periods)");

  // 4. Student Attendance Records (Last 15 School Days)
  const today = new Date();
  const attendanceStatuses: Array<"PRESENT" | "PRESENT" | "PRESENT" | "LATE" | "PRESENT" | "ABSENT" | "PRESENT"> = [
    "PRESENT", "PRESENT", "PRESENT", "PRESENT", "LATE",
    "PRESENT", "PRESENT", "PRESENT", "ABSENT", "PRESENT",
    "PRESENT", "PRESENT", "PRESENT", "LATE", "PRESENT"
  ];

  for (let i = 0; i < attendanceStatuses.length; i++) {
    const date = new Date(today.getTime() - (attendanceStatuses.length - i) * 24 * 60 * 60 * 1000);
    // skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const status = attendanceStatuses[i];
    const attId = `att_hmm_${enrollmentId}_${date.toISOString().split("T")[0]}`;
    await prisma.studentAttendance.upsert({
      where: { id: attId },
      update: { status, remarks: status === "ABSENT" ? "Excused medical clinic follow-up" : status === "LATE" ? "Late by 10 mins" : null },
      create: {
        id: attId,
        organizationId,
        academicYearId,
        enrollmentId,
        classPeriodId: "period_hmm_1",
        date,
        status,
        remarks: status === "ABSENT" ? "Excused medical clinic follow-up" : status === "LATE" ? "Late by 10 mins" : null,
        recordedById: teacherUserId
      }
    });
  }
  console.log("✓ Realistic student attendance history synced");

  // 5. Attendance Support Flag (for Submit Explanation test)
  await prisma.supportFlag.upsert({
    where: { id: "flag_att_absence_review" },
    update: {},
    create: {
      id: "flag_att_absence_review",
      organizationId,
      enrollmentId,
      type: "ATTENDANCE" as any,
      description: "Absence explanation submitted: Student had fever and attended clinic. Clinic note attached.",
      absenceDate: new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000),
      raisedById: teacherUserId,
      recipientTeacherId: teacherId
    }
  });
  console.log("✓ Attendance explanation flag verified");

  // 6. Learning Activities (Homework, Reading, Practice, Lab)
  const activities = [
    {
      id: "act_hmm_math_hw1",
      teachingAssignmentId: "ta_hmm_math_secA",
      title: "Decimal Addition & Multi-Digit Word Problems",
      description: "Complete exercises 4.1 through 4.3 on Page 84. Show all column addition steps clearly.",
      type: "HOMEWORK" as const,
      supportCategory: null,
      dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
      submission: {
        status: "SUBMITTED" as const,
        submittedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
        grade: null,
        feedback: null
      }
    },
    {
      id: "act_hmm_eng_essay",
      teachingAssignmentId: "cmv80xdrv000drbnybnibuodo",
      title: "Descriptive Paragraph: Traditional Coffee Ceremony",
      description: "Write an engaging 150-word descriptive paragraph focusing on sensory details and transition words.",
      type: "HOMEWORK" as const,
      supportCategory: null,
      dueDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      submission: {
        status: "GRADED" as const,
        submittedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
        grade: "A",
        feedback: "Superb sensory imagery! Very engaging flow and correct use of adjectives."
      }
    },
    {
      id: "act_hmm_sci_lab",
      teachingAssignmentId: "ta_hmm_sci_secA",
      title: "Photosynthesis Stomata Observation Sheet",
      description: "Fill in the laboratory diagram showing xylem, phloem, and guard cells observed under microscope.",
      type: "LAB" as const,
      supportCategory: null,
      dueDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      submission: {
        status: "GRADED" as const,
        submittedAt: new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
        grade: "94%",
        feedback: "Clear drawings and accurate labeling of cellular structures."
      }
    },
    {
      id: "act_hmm_math_practice",
      teachingAssignmentId: "ta_hmm_math_secA",
      title: "Fractions & Prime Factorization Speed Drill",
      description: "Interactive 10-question self-paced drill on simplifying proper and improper fractions.",
      type: "PRACTICE" as const,
      supportCategory: null,
      dueDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
      submission: null
    },
    {
      id: "act_hmm_eng_reading",
      teachingAssignmentId: "cmv80xdrv000drbnybnibuodo",
      title: "Passage Analysis: Biodiversity in the Simien Mountains",
      description: "Read Chapter 3 and answer comprehension check questions 1 through 6 in your notebook.",
      type: "READING" as const,
      supportCategory: null,
      dueDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000),
      submission: null
    },
    // Targeted Support: Remedial & Enrichment
    {
      id: "act_hmm_remedial_math",
      teachingAssignmentId: "ta_hmm_math_secA",
      title: "Targeted Skill Reinforcement: Long Division Step-by-Step",
      description: "Review video lesson and complete the 5 guided long division problems with remainder checking.",
      type: "PRACTICE" as const,
      supportCategory: "REMEDIAL",
      dueDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
      submission: {
        status: "SUBMITTED" as const,
        submittedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
        grade: "B+",
        feedback: "Great progress on handling remainders accurately!"
      }
    },
    {
      id: "act_hmm_enrich_sci",
      teachingAssignmentId: "ta_hmm_sci_secA",
      title: "Advanced Science Challenge: Renewable Energy Model",
      description: "Design a mini solar or water-wheel power concept diagram with efficiency calculations.",
      type: "HOMEWORK" as const,
      supportCategory: "ENRICHMENT",
      dueDate: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000),
      submission: null
    },
    {
      id: "act_hmm_rec_reading",
      teachingAssignmentId: "cmv80xdrv000drbnybnibuodo",
      title: "Teacher Recommendation: Great African Inventors & Scholars",
      description: "Read biography excerpts and write a 3-sentence summary of your favorite innovation.",
      type: "READING" as const,
      supportCategory: "RECOMMENDATION",
      dueDate: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000),
      submission: null
    }
  ];

  for (const act of activities) {
    const { submission, ...actFields } = act;
    await prisma.learningActivity.upsert({
      where: { id: act.id },
      update: {
        title: actFields.title,
        description: actFields.description,
        type: actFields.type,
        supportCategory: actFields.supportCategory,
        dueDate: actFields.dueDate
      },
      create: {
        id: act.id,
        organizationId,
        academicYearId,
        teachingAssignmentId: actFields.teachingAssignmentId,
        title: actFields.title,
        description: actFields.description,
        type: actFields.type,
        supportCategory: actFields.supportCategory,
        dueDate: actFields.dueDate
      }
    });

    if (submission) {
      await prisma.submission.upsert({
        where: {
          learningActivityId_enrollmentId: {
            learningActivityId: act.id,
            enrollmentId
          }
        },
        update: {
          status: submission.status,
          submittedAt: submission.submittedAt,
          grade: submission.grade,
          feedback: submission.feedback
        },
        create: {
          learningActivityId: act.id,
          enrollmentId,
          status: submission.status,
          submittedAt: submission.submittedAt,
          grade: submission.grade,
          feedback: submission.feedback
        }
      });
    }
  }
  console.log("✓ Learning activities, practice drills, and submissions synced");

  // 7. Digital Resources (Curriculum Textbooks, Lab Manuals, Links)
  const resources = [
    {
      id: "res_hmm_math_tb",
      title: "Grade 5 Mathematics Student Textbook (MoE Certified)",
      description: "Official Ethiopian Ministry of Education curriculum textbook covering fractions, decimals, basic geometry, and algebra fundamentals.",
      subjectName: "Mathematics",
      gradeName: "Grade 5",
      resourceType: "TEXTBOOK",
      fileUrl: "https://mineduc.gov.et/textbooks/grade5_mathematics.pdf",
      externalUrl: "https://mineduc.gov.et/textbooks/grade5_mathematics.pdf",
      source: "Ministry of Education Digital Repository"
    },
    {
      id: "res_hmm_eng_reader",
      title: "Grade 5 English Student Reader & Grammar Handbook",
      description: "Comprehensive English text with reading passages, grammar drill sets, vocabulary exercises, and writing samples.",
      subjectName: "English",
      gradeName: "Grade 5",
      resourceType: "TEXTBOOK",
      fileUrl: "https://mineduc.gov.et/textbooks/grade5_english.pdf",
      externalUrl: "https://mineduc.gov.et/textbooks/grade5_english.pdf",
      source: "School Academic Library"
    },
    {
      id: "res_hmm_sci_manual",
      title: "General Science Lab Manual & Experiment Guide",
      description: "Safety protocols, step-by-step experiment instructions for photosynthesis, simple circuits, and density measurements.",
      subjectName: "General Science",
      gradeName: "Grade 5",
      resourceType: "DOCUMENT",
      fileUrl: "https://storage.edubridge.local/science_lab_grade5.pdf",
      externalUrl: "https://storage.edubridge.local/science_lab_grade5.pdf",
      source: "Science Department Faculty"
    },
    {
      id: "res_hmm_math_ws",
      title: "Curriculum Worksheet Pack: Fractions & Percentages",
      description: "30 supplementary practice worksheets with answer keys for self-study and homework review.",
      subjectName: "Mathematics",
      gradeName: "Grade 5",
      resourceType: "WORKSHEET",
      fileUrl: "https://storage.edubridge.local/math_fractions_ws.pdf",
      externalUrl: "https://storage.edubridge.local/math_fractions_ws.pdf",
      source: "Instructor Sosina Belay"
    },
    {
      id: "res_hmm_moe_portal",
      title: "Ethiopian National Education E-Learning Portal",
      description: "Official government portal featuring video lessons, digital glossaries, and practice assessments for primary grades.",
      subjectName: "General",
      gradeName: "Grade 5",
      resourceType: "LINK",
      fileUrl: null,
      externalUrl: "https://elearning.moe.gov.et",
      source: "Ministry of Education"
    }
  ];

  for (const r of resources) {
    const res = await prisma.digitalResource.upsert({
      where: { id: r.id },
      update: {
        title: r.title,
        description: r.description,
        subjectName: r.subjectName,
        gradeName: r.gradeName,
        resourceType: r.resourceType,
        fileUrl: r.fileUrl,
        externalUrl: r.externalUrl,
        source: r.source,
        status: "PUBLISHED"
      },
      create: {
        id: r.id,
        organizationId,
        academicYearId,
        title: r.title,
        description: r.description,
        subjectName: r.subjectName,
        gradeName: r.gradeName,
        resourceType: r.resourceType,
        fileUrl: r.fileUrl,
        externalUrl: r.externalUrl,
        source: r.source,
        status: "PUBLISHED",
        createdById: teacherUserId
      }
    });

    // Add teacher recommendation
    await prisma.resourceRecommendation.upsert({
      where: { id: `rec_${r.id}` },
      update: { note: `Recommended for ${r.subjectName} curriculum study by Tr. Sosina Belay.` },
      create: {
        id: `rec_${r.id}`,
        resourceId: res.id,
        teacherId,
        academicYearId,
        schoolGradeId,
        sectionId,
        enrollmentId,
        note: `Recommended for ${r.subjectName} curriculum study by Tr. Sosina Belay.`
      }
    });
  }
  console.log("✓ Digital resources and teacher recommendations synced");

  // 8. Communication Announcements
  const announcements = [
    {
      id: "anno_hmm_midterm_schedule",
      title: "Term 1 Mid-Semester Examination Timetable Published",
      content: "Please check your exam timetable under My Assessments. Mathematics and English exams are scheduled for next week. Bring valid writing materials.",
      priority: "HIGH" as any,
      target: "STUDENTS" as any
    },
    {
      id: "anno_hmm_stem_fair",
      title: "Annual School Science & Technology Project Exhibition",
      content: "All Grade 5 sections are invited to submit their science lab models and environment posters by Friday.",
      priority: "NORMAL" as any,
      target: "ALL" as any
    }
  ];

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { id: a.id },
      update: { title: a.title, content: a.content },
      create: {
        id: a.id,
        organizationId,
        authorId: teacherUserId,
        title: a.title,
        content: a.content,
        priority: a.priority,
        target: a.target
      }
    });
  }
  console.log("✓ School announcements synced");

  console.log("\n=======================================================");
  console.log("✅ ALL STUDENT DASHBOARD DOMAINS ARE FULLY POPULATED WITH REAL DB DATA!");
  console.log("=======================================================");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
