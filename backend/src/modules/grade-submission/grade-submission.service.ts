import { prisma } from "../../infrastructure/prisma/client.js";
import ExcelJS from "exceljs";

export type SemesterTermType = "SEMESTER_1" | "SEMESTER_2";
export type GradeSubmissionStatusType = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface StudentMarkInput {
    enrollmentId: string;
    continuousAssessment?: number;
    midExam?: number;
    finalExam?: number;
    totalScore: number;
    letterGrade?: string;
    rank?: number;
    remarks?: string;
}

export class GradeSubmissionService {
    /**
     * Compute letter grade from total score out of 100
     */
    static calculateLetterGrade(score: number): string {
        if (score >= 90) return "A";
        if (score >= 80) return "B";
        if (score >= 70) return "C";
        if (score >= 60) return "D";
        return "F";
    }

    /**
     * 1. Generate Pre-filled Excel Template for a Class & Subject
     */
    static async generateTemplate(teachingAssignmentId: string, semester: SemesterTermType = "SEMESTER_1") {
        const assignment = await prisma.teachingAssignment.findUnique({
            where: { id: teachingAssignmentId },
            include: {
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: {
                    include: {
                        studentEnrollments: {
                            where: { status: "ACTIVE" },
                            include: {
                                student: true
                            },
                            orderBy: [
                                { student: { firstName: "asc" } },
                                { student: { lastName: "asc" } }
                            ]
                        }
                    }
                },
                teacher: true,
                academicYear: true
            }
        });

        if (!assignment) {
            throw new Error("Teaching assignment not found.");
        }

        const enrollments = assignment.section?.studentEnrollments || [];
        const subjectName = assignment.subject?.name || "Subject";
        const gradeName = assignment.schoolGrade?.grade?.name || `Grade ${assignment.schoolGrade?.grade?.level || ""}`;
        const sectionName = assignment.section?.name || "All Sections";
        const teacherName = assignment.teacher ? `${assignment.teacher.firstName} ${assignment.teacher.lastName}` : "Teacher";
        const academicYearName = assignment.academicYear?.name || "Current Year";
        const semesterLabel = semester === "SEMESTER_1" ? "Semester 1" : "Semester 2";

        // Fetch existing marks if any for pre-filling
        const existingBatch = await prisma.gradeSubmissionBatch.findUnique({
            where: {
                teachingAssignmentId_semester: {
                    teachingAssignmentId,
                    semester: semester as any
                }
            },
            include: {
                studentMarks: true
            }
        });

        const marksMap = new Map<string, any>();
        if (existingBatch) {
            existingBatch.studentMarks.forEach(m => {
                marksMap.set(m.enrollmentId, m);
            });
        }

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "EduBridge School Management";
        workbook.created = new Date();

        const sheetName = `${subjectName.substring(0, 15)} - ${sectionName.substring(0, 10)}`;
        const worksheet = workbook.addWorksheet(sheetName, {
            views: [{ showGridLines: true }]
        });

        // Set column widths
        worksheet.columns = [
            { key: "no", width: 6 },
            { key: "studentId", width: 16 },
            { key: "fullName", width: 28 },
            { key: "gender", width: 10 },
            { key: "continuous", width: 24 },
            { key: "finalExam", width: 20 },
            { key: "total", width: 18 },
            { key: "letterGrade", width: 14 },
            { key: "remarks", width: 22 }
        ];

        // Header Styling Palette
        const PRIMARY_BLUE = "FF1E40AF"; // Dark blue
        const HEADER_BG = "FF2563EB";    // Royal blue
        const LIGHT_ROW = "FFF8FAFC";
        const WHITE = "FFFFFFFF";

        // Row 1: Title
        worksheet.mergeCells("A1:I1");
        const titleRow = worksheet.getCell("A1");
        titleRow.value = "EDUBRIDGE — OFFICIAL STUDENT GRADE SHEET";
        titleRow.font = { name: "Arial", size: 14, bold: true, color: { argb: WHITE } };
        titleRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY_BLUE } };
        titleRow.alignment = { vertical: "middle", horizontal: "center" };
        worksheet.getRow(1).height = 30;

        // Row 2: Metadata Info
        worksheet.mergeCells("A2:I2");
        const meta1 = worksheet.getCell("A2");
        meta1.value = `Subject: ${subjectName}   |   Grade & Section: ${gradeName} - ${sectionName}   |   Academic Year: ${academicYearName}`;
        meta1.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF334155" } };
        meta1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
        meta1.alignment = { vertical: "middle", horizontal: "center" };
        worksheet.getRow(2).height = 20;

        // Row 3: Teacher & Term
        worksheet.mergeCells("A3:I3");
        const meta2 = worksheet.getCell("A3");
        meta2.value = `Teacher: ${teacherName}   |   Term: ${semesterLabel}   |   Status: ${existingBatch?.status || "NOT_SUBMITTED"}`;
        meta2.font = { name: "Arial", size: 9, italic: true, color: { argb: "FF64748B" } };
        meta2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        meta2.alignment = { vertical: "middle", horizontal: "center" };
        worksheet.getRow(3).height = 18;

        // Row 4: Instructions
        worksheet.mergeCells("A4:I4");
        const instr = worksheet.getCell("A4");
        instr.value = "Instructions: Enter Continuous Assessment (max 40) and Final Exam (max 60). Do not alter Student IDs.";
        instr.font = { name: "Arial", size: 9, bold: true, color: { argb: "FF991B1B" } };
        instr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
        instr.alignment = { vertical: "middle", horizontal: "center" };
        worksheet.getRow(4).height = 20;

        // Row 5: Column Headers
        const headers = [
            "No.",
            "Student ID",
            "Student Full Name",
            "Gender",
            "Continuous Assessment (40%)",
            "Final Exam (60%)",
            "Total Score (100%)",
            "Grade",
            "Remarks"
        ];

        const headerRow = worksheet.getRow(5);
        headerRow.values = headers;
        headerRow.height = 26;
        headerRow.eachCell((cell: any) => {
            cell.font = { name: "Arial", size: 10, bold: true, color: { argb: WHITE } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            cell.border = {
                top: { style: "thin", color: { argb: "FF94A3B8" } },
                bottom: { style: "medium", color: { argb: "FF1E293B" } },
                left: { style: "thin", color: { argb: "FF94A3B8" } },
                right: { style: "thin", color: { argb: "FF94A3B8" } }
            };
        });

        // Rows 6+: Student Data Rows
        enrollments.forEach((enr, idx) => {
            const rowNumber = 6 + idx;
            const row = worksheet.getRow(rowNumber);
            const student = enr.student;
            const fullName = `${student.firstName} ${student.lastName} ${student.fatherName || ""}`.trim();
            const existingMark = marksMap.get(enr.id);

            const ca = existingMark?.continuousAssessment ?? "";
            const fe = existingMark?.finalExam ?? "";
            const total = existingMark?.totalScore ?? "";
            const grade = existingMark?.letterGrade ?? "";
            const remarks = existingMark?.remarks ?? "";

            row.values = [
                idx + 1,
                student.studentId,
                fullName,
                student.gender || "M",
                ca,
                fe,
                total !== "" ? total : { formula: `IF(AND(ISNUMBER(E${rowNumber}),ISNUMBER(F${rowNumber})),E${rowNumber}+F${rowNumber},"")` },
                grade,
                remarks
            ];

            row.height = 20;
            const isEven = idx % 2 === 0;

            row.eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
                cell.font = { name: "Arial", size: 10 };
                cell.alignment = {
                    vertical: "middle",
                    horizontal: colNumber === 1 || colNumber === 4 || colNumber === 8 ? "center" :
                                colNumber === 5 || colNumber === 6 || colNumber === 7 ? "right" : "left"
                };
                cell.border = {
                    top: { style: "thin", color: { argb: "FFE2E8F0" } },
                    bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                    left: { style: "thin", color: { argb: "FFE2E8F0" } },
                    right: { style: "thin", color: { argb: "FFE2E8F0" } }
                };

                // Alternate background for readability
                if (isEven) {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_ROW } };
                }

                // Highlight score columns with soft tinted background
                if (colNumber === 5 || colNumber === 6) {
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } }; // Soft light green for input
                }
                if (colNumber === 7) {
                    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: PRIMARY_BLUE } };
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } }; // Soft blue for total
                }
            });
        });

        const rawBuffer = await workbook.xlsx.writeBuffer();
        const buffer = Buffer.from(rawBuffer);

        const safeFilename = `GradeSheet_${gradeName.replace(/\s+/g, "_")}_${sectionName}_${subjectName.replace(/\s+/g, "_")}_${semester}.xlsx`;

        return {
            filename: safeFilename,
            buffer
        };
    }

    /**
     * 2. Parse & Validate Uploaded Excel
     */
    static async previewImport(
        teachingAssignmentId: string,
        semester: SemesterTermType = "SEMESTER_1",
        fileBuffer: Buffer | string
    ) {
        const assignment = await prisma.teachingAssignment.findUnique({
            where: { id: teachingAssignmentId },
            include: {
                section: {
                    include: {
                        studentEnrollments: {
                            where: { status: "ACTIVE" },
                            include: { student: true }
                        }
                    }
                }
            }
        });

        if (!assignment) {
            throw new Error("Teaching assignment not found.");
        }

        const enrollments = assignment.section?.studentEnrollments || [];
        const studentMapByStudentId = new Map<string, any>();
        enrollments.forEach(e => {
            studentMapByStudentId.set(e.student.studentId.trim().toUpperCase(), e);
        });

        const buffer = typeof fileBuffer === "string" 
            ? Buffer.from(fileBuffer.replace(/^data:.*?;base64,/, ""), "base64")
            : fileBuffer;

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            throw new Error("No worksheets found in uploaded file.");
        }

        // Find header row containing "Student ID"
        let headerRowIndex = 5;
        for (let r = 1; r <= 10; r++) {
            const row = worksheet.getRow(r);
            let found = false;
            row.eachCell((cell: any) => {
                const val = String(cell.value || "").toLowerCase();
                if (val.includes("student id") || val.includes("id")) {
                    found = true;
                }
            });
            if (found) {
                headerRowIndex = r;
                break;
            }
        }

        const records: Array<any> = [];
        const errors: string[] = [];

        worksheet.eachRow((row: any, rowNumber: number) => {
            if (rowNumber <= headerRowIndex) return;

            const studentIdRaw = row.getCell(2).value;
            if (!studentIdRaw) return; // Skip empty row

            const studentId = String(studentIdRaw).trim().toUpperCase();
            const caVal = row.getCell(5).value;
            const feVal = row.getCell(6).value;
            const totalVal = row.getCell(7).value;
            const remarksVal = row.getCell(9).value;

            // Extract numeric values handling Excel formulas/objects
            const parseNum = (val: any): number => {
                if (val === null || val === undefined || val === "") return 0;
                if (typeof val === "object" && "result" in val) return Number(val.result) || 0;
                const num = Number(val);
                return isNaN(num) ? 0 : num;
            };

            const continuousAssessment = parseNum(caVal);
            const finalExam = parseNum(feVal);

            let totalScore = parseNum(totalVal);
            if (!totalScore && (continuousAssessment > 0 || finalExam > 0)) {
                totalScore = Math.min(100, Math.round((continuousAssessment + finalExam) * 100) / 100);
            }

            const enrollment = studentMapByStudentId.get(studentId);
            let rowError: string | undefined;

            if (!enrollment) {
                rowError = `Student ID '${studentId}' does not belong to this active section roster.`;
                errors.push(`Row ${rowNumber}: ${rowError}`);
            } else if (continuousAssessment < 0 || continuousAssessment > 100) {
                rowError = `Continuous assessment score must be between 0 and 100 (got ${continuousAssessment}).`;
                errors.push(`Row ${rowNumber}: ${rowError}`);
            } else if (finalExam < 0 || finalExam > 100) {
                rowError = `Final exam score must be between 0 and 100 (got ${finalExam}).`;
                errors.push(`Row ${rowNumber}: ${rowError}`);
            } else if (totalScore < 0 || totalScore > 100) {
                rowError = `Total score must not exceed 100 (got ${totalScore}).`;
                errors.push(`Row ${rowNumber}: ${rowError}`);
            }

            records.push({
                rowNumber,
                enrollmentId: enrollment ? enrollment.id : null,
                studentId,
                studentName: enrollment ? `${enrollment.student.firstName} ${enrollment.student.lastName}` : (String(row.getCell(3).value || "Unknown")),
                gender: enrollment?.student?.gender || String(row.getCell(4).value || "M"),
                continuousAssessment,
                finalExam,
                totalScore,
                letterGrade: GradeSubmissionService.calculateLetterGrade(totalScore),
                remarks: remarksVal ? String(remarksVal).trim() : undefined,
                isValid: !rowError,
                error: rowError
            });
        });

        // Compute rankings for valid students
        const validRecords = records.filter(r => r.isValid).sort((a, b) => b.totalScore - a.totalScore);
        validRecords.forEach((r, idx) => {
            r.rank = idx + 1;
        });

        const totalScores = validRecords.map(r => r.totalScore);
        const classAverage = totalScores.length > 0 ? Math.round((totalScores.reduce((a, b) => a + b, 0) / totalScores.length) * 10) / 10 : 0;
        const highestScore = totalScores.length > 0 ? Math.max(...totalScores) : 0;
        const lowestScore = totalScores.length > 0 ? Math.min(...totalScores) : 0;

        return {
            success: errors.length === 0,
            summary: {
                totalRows: records.length,
                validCount: validRecords.length,
                errorCount: records.length - validRecords.length,
                classAverage,
                highestScore,
                lowestScore
            },
            records,
            errors
        };
    }

    /**
     * 3. Save Draft Grades
     */
    static async saveDraft(
        teachingAssignmentId: string,
        semester: SemesterTermType,
        marks: StudentMarkInput[],
        actorUserId: string
    ) {
        const assignment = await prisma.teachingAssignment.findUnique({
            where: { id: teachingAssignmentId },
            include: { academicYear: true }
        });

        if (!assignment) {
            throw new Error("Teaching assignment not found.");
        }

        // Verify current batch status
        const existingBatch = await prisma.gradeSubmissionBatch.findUnique({
            where: {
                teachingAssignmentId_semester: {
                    teachingAssignmentId,
                    semester: semester as any
                }
            }
        });

        if (existingBatch && existingBatch.status === "APPROVED") {
            throw new Error("This grade submission has already been approved by administration and cannot be modified.");
        }

        // Upsert batch
        const batch = await prisma.gradeSubmissionBatch.upsert({
            where: {
                teachingAssignmentId_semester: {
                    teachingAssignmentId,
                    semester: semester as any
                }
            },
            update: {
                status: "DRAFT" as any,
                rejectionReason: null
            },
            create: {
                teachingAssignmentId,
                academicYearId: assignment.academicYearId,
                semester: semester as any,
                status: "DRAFT" as any
            }
        });

        // Upsert marks in transaction
        await prisma.$transaction(
            marks.map(m => {
                const totalScore = m.totalScore || Math.min(100, (m.continuousAssessment || 0) + (m.finalExam || 0));
                const letterGrade = m.letterGrade || GradeSubmissionService.calculateLetterGrade(totalScore);

                return prisma.studentMark.upsert({
                    where: {
                        submissionBatchId_enrollmentId: {
                            submissionBatchId: batch.id,
                            enrollmentId: m.enrollmentId
                        }
                    },
                    update: {
                        continuousAssessment: m.continuousAssessment ?? 0,
                        midExam: m.midExam ?? 0,
                        finalExam: m.finalExam ?? 0,
                        totalScore,
                        letterGrade,
                        rank: m.rank,
                        remarks: m.remarks
                    },
                    create: {
                        submissionBatchId: batch.id,
                        enrollmentId: m.enrollmentId,
                        continuousAssessment: m.continuousAssessment ?? 0,
                        midExam: m.midExam ?? 0,
                        finalExam: m.finalExam ?? 0,
                        totalScore,
                        letterGrade,
                        rank: m.rank,
                        remarks: m.remarks
                    }
                });
            })
        );

        return this.getSubmission(teachingAssignmentId, semester);
    }

    /**
     * 4. Submit to School Admin
     */
    static async submitBatch(batchId: string, actorUserId: string, organizationId: string) {
        const batch = await prisma.gradeSubmissionBatch.findUnique({
            where: { id: batchId },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        teacher: true
                    }
                },
                studentMarks: true
            }
        });

        if (!batch) {
            throw new Error("Grade submission batch not found.");
        }

        if (batch.status === "APPROVED") {
            throw new Error("Batch has already been approved.");
        }

        if (batch.studentMarks.length === 0) {
            throw new Error("Cannot submit an empty grade sheet. Please enter student marks first.");
        }

        const updatedBatch = await prisma.gradeSubmissionBatch.update({
            where: { id: batchId },
            data: {
                status: "SUBMITTED" as any,
                submittedAt: new Date(),
                rejectionReason: null
            }
        });

        // Notify school administrators
        const adminRoles = await prisma.roleAssignment.findMany({
            where: {
                scopeId: organizationId,
                role: {
                    name: { in: ["ADMIN", "SCHOOL_ADMIN", "PRINCIPAL", "VICE_PRINCIPAL"] }
                }
            },
            select: { userId: true }
        });

        const subjectName = batch.teachingAssignment.subject?.name || "Subject";
        const sectionName = batch.teachingAssignment.section?.name || "Section";
        const teacherName = batch.teachingAssignment.teacher 
            ? `${batch.teachingAssignment.teacher.firstName} ${batch.teachingAssignment.teacher.lastName}`
            : "Teacher";
        const termName = batch.semester === "SEMESTER_1" ? "Semester 1" : "Semester 2";

        const adminUserIds = Array.from(new Set(adminRoles.map(a => a.userId)));
        if (adminUserIds.length > 0) {
            await prisma.notification.createMany({
                data: adminUserIds.map(userId => ({
                    userId,
                    organizationId,
                    title: `New Grade Submission: ${subjectName} (${sectionName})`,
                    content: `Teacher ${teacherName} has submitted ${termName} student marks for administrative review and approval.`,
                    link: `/dashboard/reports?tab=grades`
                }))
            });
        }

        return updatedBatch;
    }

    /**
     * 5. Get Current Submission for a Class & Semester
     */
    static async getSubmission(teachingAssignmentId: string, semester: SemesterTermType = "SEMESTER_1") {
        const batch = await prisma.gradeSubmissionBatch.findUnique({
            where: {
                teachingAssignmentId_semester: {
                    teachingAssignmentId,
                    semester: semester as any
                }
            },
            include: {
                approvedBy: {
                    select: { id: true, name: true, email: true }
                },
                studentMarks: {
                    include: {
                        enrollment: {
                            include: {
                                student: true
                            }
                        }
                    },
                    orderBy: [
                        { totalScore: "desc" }
                    ]
                }
            }
        });

        return batch;
    }

    /**
     * 6. Admin: List Submissions in School
     */
    static async listAdminSubmissions(
        organizationId: string,
        filters: {
            status?: GradeSubmissionStatusType;
            semester?: SemesterTermType;
            academicYearId?: string;
        } = {}
    ) {
        const submissions = await prisma.gradeSubmissionBatch.findMany({
            where: {
                teachingAssignment: {
                    academicYear: {
                        organizationId
                    }
                },
                ...(filters.status ? { status: filters.status as any } : {}),
                ...(filters.semester ? { semester: filters.semester as any } : {}),
                ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {})
            },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        teacher: true
                    }
                },
                approvedBy: {
                    select: { id: true, name: true }
                },
                _count: {
                    select: { studentMarks: true }
                }
            },
            orderBy: {
                updatedAt: "desc"
            }
        });

        return submissions;
    }

    /**
     * 7. Admin: Review (Approve or Reject) Submission
     */
    static async reviewSubmission(
        batchId: string,
        adminUserId: string,
        organizationId: string,
        action: "APPROVE" | "REJECT",
        rejectionReason?: string
    ) {
        const batch = await prisma.gradeSubmissionBatch.findUnique({
            where: { id: batchId },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        section: true,
                        teacher: {
                            select: { id: true, userId: true, firstName: true }
                        }
                    }
                }
            }
        });

        if (!batch) {
            throw new Error("Grade submission batch not found.");
        }

        const isApprove = action === "APPROVE";

        const updated = await prisma.gradeSubmissionBatch.update({
            where: { id: batchId },
            data: {
                status: (isApprove ? "APPROVED" : "REJECTED") as any,
                approvedById: isApprove ? adminUserId : null,
                approvedAt: isApprove ? new Date() : null,
                rejectionReason: !isApprove ? (rejectionReason || "Revisions required by school administration.") : null
            }
        });

        // Notify the teacher
        const teacherUserId = batch.teachingAssignment.teacher?.userId;
        if (teacherUserId) {
            const subjectName = batch.teachingAssignment.subject?.name || "Subject";
            const sectionName = batch.teachingAssignment.section?.name || "Section";

            await prisma.notification.create({
                data: {
                    userId: teacherUserId,
                    organizationId,
                    title: isApprove 
                        ? `Grade Sheet Approved: ${subjectName} (${sectionName})` 
                        : `Grade Sheet Revision Required: ${subjectName} (${sectionName})`,
                    content: isApprove
                        ? `Your submitted marks for ${subjectName} (${sectionName}) have been approved by administration.`
                        : `Your grade submission for ${subjectName} (${sectionName}) requires revision. Reason: ${rejectionReason || "Check with administration."}`,
                    link: `/dashboard/teacher/my-classes`
                }
            });
        }

        return updated;
    }
}
