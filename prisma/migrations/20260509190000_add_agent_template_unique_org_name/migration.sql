-- AlterTable: Add unique constraint on (orgId, name) for agent_templates
CREATE UNIQUE INDEX "agent_templates_orgId_name_key" ON "agent_templates"("orgId", "name");
