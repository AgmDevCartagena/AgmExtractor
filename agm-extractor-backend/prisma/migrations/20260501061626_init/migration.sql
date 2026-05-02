-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contraseña" TEXT NOT NULL,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas_programadas" (
    "id" TEXT NOT NULL,
    "parteProcesal" TEXT NOT NULL,
    "juzgado" TEXT NOT NULL,
    "frecuencia" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tareas_programadas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procesos_judiciales" (
    "id" TEXT NOT NULL,
    "radicado" TEXT NOT NULL,
    "tipoProceso" TEXT,
    "ponente" TEXT,
    "demandante" TEXT,
    "demandado" TEXT,
    "textoCompleto" TEXT,
    "fechaDescubrimiento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tareaProgramadaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "procesos_judiciales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "tareas_programadas" ADD CONSTRAINT "tareas_programadas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procesos_judiciales" ADD CONSTRAINT "procesos_judiciales_tareaProgramadaId_fkey" FOREIGN KEY ("tareaProgramadaId") REFERENCES "tareas_programadas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
