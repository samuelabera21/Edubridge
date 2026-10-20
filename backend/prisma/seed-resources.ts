import { prisma } from "../src/infrastructure/prisma/client.js";

async function seedRealWorldResources() {
    console.log("🌱 Seeding real-world digital resources and recommendations...");

    const schoolId = "cmsrmaa6g000175qstx9zadrb";
    const academicYearId = "cmt2mr4y300008gnwifeqpio3";
    const schoolGradeId = "cmt2mr4z800038gnwx98fiwx4"; // Grade 9
    const sectionId = "cmt2mr4zo00058gnwl6vmdmt1"; // 9A
    const teacherId = "cmtoq3fp100016mpvmln0p9bf"; // Selam Abebe
    const adminUserId = "7DeCX1IrdS68qBMiOmIWcLv44WDHKRip";

    // 1. Digital Resources
    const resourcesData = [
        {
            id: "dr_math_openstax",
            organizationId: schoolId,
            title: "OpenStax Algebra and Trigonometry (Core Textbook)",
            description: "Official open-access curriculum textbook covering linear equations, functions, polynomial equations, analytical geometry, and trigonometric identities.",
            subjectName: "Mathematics",
            gradeName: "Grade 9",
            academicYearId,
            resourceType: "TEXTBOOK",
            fileUrl: "https://assets.openstax.org/oscms-prodcms/media/documents/Algebra_and_Trigonometry_2e-WEB_1.pdf",
            externalUrl: "https://openstax.org/details/books/algebra-and-trigonometry-2e",
            status: "PUBLISHED",
            source: "OpenStax / Rice University Open Curriculum Initiative",
            createdById: adminUserId,
            recommendation: {
                note: "Assigned core textbook: read Chapter 3 and 4 for linear equations & function graphs."
            }
        },
        {
            id: "dr_math_geogebra",
            organizationId: schoolId,
            title: "GeoGebra Graphing Calculator & Geometric Construction Suite",
            description: "Interactive online mathematics simulation environment for graphing 2D functions, analyzing slopes, roots, intersecting lines, and geometric proofs.",
            subjectName: "Mathematics",
            gradeName: "Grade 9",
            academicYearId,
            resourceType: "LINK",
            fileUrl: null,
            externalUrl: "https://www.geogebra.org/calculator",
            status: "PUBLISHED",
            source: "GeoGebra International Educational Software",
            createdById: adminUserId,
            recommendation: {
                note: "Use the graphing calculator to verify your homework solutions for Section 9A."
            }
        },
        {
            id: "dr_math_worksheet",
            organizationId: schoolId,
            title: "Grade 9 Mathematics Practice Problem Packet - Polynomials & Factoring",
            description: "Structured worksheet containing 30 graded practice problems, step-by-step factorization exercises, quadratic formula applications, and answer keys.",
            subjectName: "Mathematics",
            gradeName: "Grade 9",
            academicYearId,
            resourceType: "WORKSHEET",
            fileUrl: "https://openstax.org/books/elementary-algebra-2e/pages/9-practice-test",
            externalUrl: "https://openstax.org/books/elementary-algebra-2e/pages/9-practice-test",
            status: "PUBLISHED",
            source: "Department of Mathematics Curriculum Board",
            createdById: adminUserId,
            recommendation: {
                note: "Complete odd-numbered problems 1-19 before our Thursday problem session."
            }
        },
        {
            id: "dr_english_college_success",
            organizationId: schoolId,
            title: "Academic English Reading Strategies & Vocabulary Handbook",
            description: "Comprehensive English guide focusing on active reading comprehension, academic vocabulary acquisition, essay writing structure, and textual rhetoric.",
            subjectName: "English",
            gradeName: "Grade 9",
            academicYearId,
            resourceType: "TEXTBOOK",
            fileUrl: "https://assets.openstax.org/oscms-prodcms/media/documents/College_Success-WEB.pdf",
            externalUrl: "https://openstax.org/details/books/college-success",
            status: "PUBLISHED",
            source: "Open Educational Curriculum Library",
            createdById: adminUserId
        },
        {
            id: "dr_science_phet_lab",
            organizationId: schoolId,
            title: "PhET Interactive Science & Physics Simulation Lab",
            description: "Research-proven interactive virtual laboratory simulations covering kinematics, forces, motion, friction, and energy conservation.",
            subjectName: "Physics",
            gradeName: "Grade 9",
            academicYearId,
            resourceType: "LINK",
            fileUrl: null,
            externalUrl: "https://phet.colorado.edu/en/simulations/browse",
            status: "PUBLISHED",
            source: "University of Colorado Boulder PhET Lab",
            createdById: adminUserId
        },
        {
            id: "dr_chemistry_openstax",
            organizationId: schoolId,
            title: "OpenStax Chemistry 2e Reference Guide & Periodic System",
            description: "Foundational chemistry textbook covering atomic theory, periodic trends, molecular structure, chemical equations, and stoichiometry.",
            subjectName: "Chemistry",
            gradeName: "Grade 9",
            academicYearId,
            resourceType: "DOCUMENT",
            fileUrl: "https://assets.openstax.org/oscms-prodcms/media/documents/Chemistry2e-WEB_1.pdf",
            externalUrl: "https://openstax.org/details/books/chemistry-2e",
            status: "PUBLISHED",
            source: "National Science Education Network",
            createdById: adminUserId
        },
        {
            id: "dr_biology_khan_series",
            organizationId: schoolId,
            title: "High School Biology Interactive Video Lecture Series",
            description: "Structured high school biology lecture modules covering cell division, photosynthesis, cellular respiration, Mendelian genetics, and ecosystems.",
            subjectName: "Biology",
            gradeName: "Grade 9",
            academicYearId,
            resourceType: "VIDEO",
            fileUrl: null,
            externalUrl: "https://www.khanacademy.org/science/high-school-biology",
            status: "PUBLISHED",
            source: "Khan Academy Global Secondary Education",
            createdById: adminUserId
        }
    ];

    for (const item of resourcesData) {
        const { recommendation, ...resourceData } = item;
        const upserted = await prisma.digitalResource.upsert({
            where: { id: resourceData.id },
            update: resourceData,
            create: resourceData
        });

        if (recommendation) {
            const recId = `rec_${upserted.id}_${sectionId}`;
            await prisma.resourceRecommendation.upsert({
                where: { id: recId },
                update: {
                    note: recommendation.note,
                    teacherId,
                    academicYearId,
                    schoolGradeId,
                    sectionId
                },
                create: {
                    id: recId,
                    resourceId: upserted.id,
                    teacherId,
                    academicYearId,
                    schoolGradeId,
                    sectionId,
                    note: recommendation.note
                }
            });
        }
    }

    // 2. Real Learning Activities tied to Teacher Selam Abebe's Mathematics class
    const assignmentId = "ta_sec_math_selam";
    const activities = [
        {
            id: "act_math_hw_1",
            organizationId: schoolId,
            academicYearId,
            teachingAssignmentId: assignmentId,
            title: "Quadratic Equations and Factoring Practice Set",
            description: "Solve problems 1 through 15 from the factoring practice sheet. Show all intermediate factoring steps and algebraic checks.",
            type: "HOMEWORK" as const,
            dueDate: new Date(Date.now() + 86400000 * 3) // 3 days from now
        },
        {
            id: "act_math_lab_1",
            organizationId: schoolId,
            academicYearId,
            teachingAssignmentId: assignmentId,
            title: "GeoGebra Coordinate Geometry & Functions Lab",
            description: "Plot the 5 assigned quadratic functions in GeoGebra, determine vertex and axis of symmetry, and export your coordinate plot.",
            type: "LAB" as const,
            dueDate: new Date(Date.now() + 86400000 * 6) // 6 days from now
        }
    ];

    for (const act of activities) {
        await prisma.learningActivity.upsert({
            where: { id: act.id },
            update: act,
            create: act
        });
    }

    console.log("✅ Real-world digital resources and learning activities seeded successfully!");
}

seedRealWorldResources()
    .catch((err) => {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
