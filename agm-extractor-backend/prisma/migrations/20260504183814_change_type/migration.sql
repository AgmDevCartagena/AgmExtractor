/*
  Warnings:

  - The `parteProcesal` column on the `tareas_programadas` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "tareas_programadas" DROP COLUMN "parteProcesal",
ADD COLUMN     "parteProcesal" TEXT[];
