-- AlterTable
ALTER TABLE "users" ADD COLUMN     "empresa" TEXT,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
