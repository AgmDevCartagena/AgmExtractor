-- AlterTable
ALTER TABLE "tareas_programadas" ADD COLUMN     "ultimaEjecucion" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tareas_programadas_radicado" ADD COLUMN     "ultimaEjecucion" TIMESTAMP(3);
