-- AlterTable
ALTER TABLE "procesos_judiciales" ADD COLUMN     "asunto" TEXT,
ADD COLUMN     "clase" TEXT,
ADD COLUMN     "corporacion" TEXT,
ADD COLUMN     "detalleExtraido" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "etapa" TEXT,
ADD COLUMN     "fechaPresentacion" TIMESTAMP(3),
ADD COLUMN     "fechaRadicado" TIMESTAMP(3),
ADD COLUMN     "formatoExpediente" TEXT,
ADD COLUMN     "marcoLegal" TEXT,
ADD COLUMN     "naturaleza" TEXT,
ADD COLUMN     "origen" TEXT,
ADD COLUMN     "recurso" TEXT,
ADD COLUMN     "salaConoce" TEXT,
ADD COLUMN     "salaDecide" TEXT,
ADD COLUMN     "sentencia" TEXT,
ADD COLUMN     "subclase" TEXT,
ADD COLUMN     "ubicacion" TEXT,
ADD COLUMN     "vigente" BOOLEAN;

-- CreateTable
CREATE TABLE "actuaciones" (
    "id" TEXT NOT NULL,
    "fechaRegistro" TIMESTAMP(3),
    "fechaActuacion" TIMESTAMP(3),
    "actuacion" TEXT,
    "anotacion" TEXT,
    "estado" TEXT,
    "anexos" INTEGER NOT NULL DEFAULT 0,
    "indice" TEXT,
    "procesoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actuaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "actuaciones_procesoId_indice_key" ON "actuaciones"("procesoId", "indice");

-- AddForeignKey
ALTER TABLE "actuaciones" ADD CONSTRAINT "actuaciones_procesoId_fkey" FOREIGN KEY ("procesoId") REFERENCES "procesos_judiciales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
