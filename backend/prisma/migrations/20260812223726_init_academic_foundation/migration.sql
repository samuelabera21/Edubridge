-- CreateEnum
CREATE TYPE "AcademicYearStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "academic_year" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AcademicYearStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_year_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_grade" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "gradeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section" (
    "id" TEXT NOT NULL,
    "schoolGradeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_subject" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_subject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academic_year_organizationId_name_key" ON "academic_year"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "grade_organizationId_level_key" ON "grade"("organizationId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "grade_organizationId_name_key" ON "grade"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "school_grade_academicYearId_gradeId_key" ON "school_grade"("academicYearId", "gradeId");

-- CreateIndex
CREATE UNIQUE INDEX "section_schoolGradeId_name_key" ON "section"("schoolGradeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "subject_organizationId_name_key" ON "subject"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "school_subject_academicYearId_subjectId_key" ON "school_subject"("academicYearId", "subjectId");

-- AddForeignKey
ALTER TABLE "academic_year" ADD CONSTRAINT "academic_year_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade" ADD CONSTRAINT "grade_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_grade" ADD CONSTRAINT "school_grade_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_year"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_grade" ADD CONSTRAINT "school_grade_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section" ADD CONSTRAINT "section_schoolGradeId_fkey" FOREIGN KEY ("schoolGradeId") REFERENCES "school_grade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subject" ADD CONSTRAINT "subject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_subject" ADD CONSTRAINT "school_subject_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_year"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_subject" ADD CONSTRAINT "school_subject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
