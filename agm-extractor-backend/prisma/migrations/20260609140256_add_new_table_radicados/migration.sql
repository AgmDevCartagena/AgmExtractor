-- DropForeignKey
ALTER TABLE "procesos_judiciales" DROP CONSTRAINT "procesos_judiciales_tareaProgramadaId_fkey";

-- AlterTable
ALTER TABLE "procesos_judiciales" ADD COLUMN     "tareaProgramadaRadicadoId" TEXT,
ALTER COLUMN "tareaProgramadaId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "tareas_programadas_radicado" (
    "id" TEXT NOT NULL,
    "radicado" TEXT NOT NULL,
    "juzgado" TEXT NOT NULL,
    "frecuencia" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tareas_programadas_radicado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tareas_programadas_radicado_userId_radicado_key" ON "tareas_programadas_radicado"("userId", "radicado");

-- AddForeignKey
ALTER TABLE "procesos_judiciales" ADD CONSTRAINT "procesos_judiciales_tareaProgramadaId_fkey" FOREIGN KEY ("tareaProgramadaId") REFERENCES "tareas_programadas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procesos_judiciales" ADD CONSTRAINT "procesos_judiciales_tareaProgramadaRadicadoId_fkey" FOREIGN KEY ("tareaProgramadaRadicadoId") REFERENCES "tareas_programadas_radicado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas_programadas_radicado" ADD CONSTRAINT "tareas_programadas_radicado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
