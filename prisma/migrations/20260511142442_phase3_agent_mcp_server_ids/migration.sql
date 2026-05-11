-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "mcpServerIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
