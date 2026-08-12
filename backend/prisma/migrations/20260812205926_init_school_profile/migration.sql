-- CreateTable
CREATE TABLE "school_profile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "establishedYear" INTEGER,
    "contactEmail" TEXT,
    "phoneNumber" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "school_profile_organizationId_key" ON "school_profile"("organizationId");

-- AddForeignKey
ALTER TABLE "school_profile" ADD CONSTRAINT "school_profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "OrganizationUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
