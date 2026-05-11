-- CreateEnum
CREATE TYPE "SkillSource" AS ENUM ('custom', 'github', 'curated');

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" "SkillSource" NOT NULL,
    "sourceUrl" TEXT,
    "sourceRef" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "files" JSONB NOT NULL DEFAULT '[]',
    "triggers" TEXT[],
    "userInvocable" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_regen_jobs" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "profile_regen_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "skills_orgId_name_key" ON "skills"("orgId", "name");

-- CreateIndex
CREATE INDEX "profile_regen_jobs_status_createdAt_idx" ON "profile_regen_jobs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "profile_regen_jobs_agentId_status_idx" ON "profile_regen_jobs"("agentId", "status");

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_regen_jobs" ADD CONSTRAINT "profile_regen_jobs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: at most one pending regen job per agent (dedup on rapid edits)
CREATE UNIQUE INDEX "profile_regen_jobs_agentId_pending_unique" ON "profile_regen_jobs"("agentId") WHERE status = 'pending';
