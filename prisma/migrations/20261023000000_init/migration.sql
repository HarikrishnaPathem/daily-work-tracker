CREATE TYPE "Role" AS ENUM ('USER', 'HEAD');
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "name" TEXT NOT NULL, "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL, "role" "Role" NOT NULL DEFAULT 'USER', "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_single_head_key" ON "User"("role") WHERE "role" = 'HEAD';

CREATE TABLE "DailyReport" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "workDate" DATE NOT NULL,
  "completedTasks" TEXT NOT NULL, "ongoingTasks" TEXT NOT NULL, "blockers" TEXT NOT NULL, "nextSteps" TEXT NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT', "reviewerComment" TEXT, "reviewedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DailyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DailyReport_userId_workDate_key" ON "DailyReport"("userId", "workDate");
CREATE INDEX "DailyReport_status_workDate_idx" ON "DailyReport"("status", "workDate");

CREATE TABLE "Session" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "tokenHash" TEXT NOT NULL, "userId" UUID NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

CREATE TABLE "ReportReview" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "reportId" UUID NOT NULL, "reviewerId" UUID NOT NULL,
  "decision" "ReportStatus" NOT NULL, "comment" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReportReview_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "DailyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ReportReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ReportReview_reportId_createdAt_idx" ON "ReportReview"("reportId", "createdAt");
