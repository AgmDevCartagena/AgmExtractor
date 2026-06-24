import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { auth } from '../src/lib/auth';

/**
 * Seeder idempotente del administrador por defecto.
 *
 * Crea (o asegura) un usuario administrador. La contraseña se registra a través
 * de la API de better-auth (`auth.api.signUpEmail`) para que el hash sea
 * compatible con el inicio de sesión. Re-ejecutarlo no duplica el usuario:
 * si ya existe, solo garantiza que tenga rol admin y la cuenta activa.
 *
 * Configurable por variables de entorno (con valores por defecto):
 *   SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME,
 *   SEED_ADMIN_PHONE, SEED_ADMIN_COMPANY
 */

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ADMIN = {
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@radar.com',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345',
    name: process.env.SEED_ADMIN_NAME ?? 'Administrador RADAR',
    telefono: process.env.SEED_ADMIN_PHONE ?? '3000000000',
    empresa: process.env.SEED_ADMIN_COMPANY ?? 'AGM',
};

async function main() {
    const username = ADMIN.email.split('@')[0].toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: ADMIN.email } });

    if (existing) {
        // Idempotencia: no se recrea; solo se asegura rol admin y cuenta activa.
        if (existing.role !== 'admin' || existing.estado === false || !existing.emailVerified) {
            await prisma.user.update({
                where: { id: existing.id },
                data: { role: 'admin', estado: true, emailVerified: true },
            });
            console.log(`✔ Administrador existente actualizado: ${ADMIN.email}`);
        } else {
            console.log(`✔ Administrador ya existe, sin cambios: ${ADMIN.email}`);
        }
        return;
    }

    // No existe: lo creamos vía better-auth para que el hash sea válido.
    await auth.api.signUpEmail({
        body: {
            email: ADMIN.email,
            password: ADMIN.password,
            name: ADMIN.name,
            telefono: ADMIN.telefono,
            empresa: ADMIN.empresa,
            username,
            displayUsername: username,
        },
    });

    // Promovemos a admin y dejamos la cuenta lista para usar.
    await prisma.user.update({
        where: { email: ADMIN.email },
        data: {
            role: 'admin',
            estado: true,
            emailVerified: true,
            mustChangePassword: false,
        },
    });

    console.log('✔ Administrador por defecto creado:');
    console.log(`   email:    ${ADMIN.email}`);
    console.log(`   password: ${ADMIN.password}`);
    console.log('   (cámbiala tras el primer ingreso)');
}

main()
    .catch((err) => {
        console.error('✖ Error ejecutando el seeder:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
