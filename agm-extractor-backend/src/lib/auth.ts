import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [
        'http://localhost:5173',
    ],

    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),

    user: {

        fields: {
            name: 'nombre',
        },
        additionalFields: {
            estado: {
                type: 'boolean',
                required: false,
                defaultValue: true,
            },
        },
    },

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
    },

    hooks: {},
});