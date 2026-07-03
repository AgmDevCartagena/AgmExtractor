import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { username, twoFactor, admin } from 'better-auth/plugins';
import { createAuthMiddleware, APIError } from 'better-auth/api';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { sendEmail } from './mailer';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [
        process.env.ALLOW_ORIGIN as string,
    ],

    database: prismaAdapter(prisma, {
        provider: 'postgresql',
    }),
    session: {
        expiresIn: 60 * 30,
        updateAge: 60 * 15,
    },

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
            telefono: {
                type: 'string',
                required: true,
            },
            empresa: {
                type: 'string',
                required: false,
            },
            // El admin lo asigna; el cliente no puede enviarlo (input: false).
            mustChangePassword: {
                type: 'boolean',
                required: false,
                defaultValue: false,
                input: false,
            },
        },
    },

    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        sendResetPassword: async ({ user, token }) => {
            const resetLink = `${process.env.ALLOW_ORIGIN}/reset-password?token=${token}`;
            await sendEmail({
                to: user.email,
                subject: 'Restablecer tu contraseña - RADAR',
                html: `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #1e293b;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                            <!-- Header -->
                            <div style="background-color: #0f172a; padding: 32px; text-align: center;">
                                <div style="display: inline-flex; align-items: center; gap: 12px;">
                                    <div style="background-color: #2563eb; padding: 8px; border-radius: 8px; display: inline-block;">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/></svg>
                                    </div>
                                    <span style="color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -0.025em; margin-left: 10px;">RADAR</span>
                                </div>
                            </div>
                            
                            <!-- Content -->
                            <div style="padding: 40px 32px;">
                                <h1 style="font-size: 24px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">Restablecimiento de contraseña</h1>
                                <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 24px;">
                                    Hola <strong>${user.name || user.email}</strong>,
                                </p>
                                <p style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 32px;">
                                    Has solicitado restablecer tu contraseña para tu cuenta en RADAR. Haz clic en el botón de abajo para continuar con el proceso:
                                </p>
                                
                                <div style="text-align: center; margin-bottom: 32px;">
                                    <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                                        Restablecer mi contraseña
                                    </a>
                                </div>
                                
                                <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 0;">
                                    Si no solicitaste este cambio, puedes ignorar este correo de forma segura. El enlace expirará en 1 hora.
                                </p>
                            </div>
                            
                            <!-- Footer -->
                            <div style="padding: 24px 32px; border-top: 1px solid #f1f5f9; background-color: #fcfcfd; text-align: center;">
                                <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                                    &copy; 2026 AGM RADAR. Todos los derechos reservados.<br>
                                    Este es un correo automático, por favor no respondas a este mensaje.
                                </p>
                            </div>
                        </div>
                    </div>
                `,
            });
        },
    },

    plugins: [
        username(),
        twoFactor({ issuer: 'RADAR' }),
        admin({
            adminUserIds: (process.env.ADMIN_USER_IDS ?? '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
        }),
    ],

    hooks: {
        // Bloqueo de login para usuarios desactivados (estado === false).
        before: createAuthMiddleware(async (ctx) => {
            if (ctx.path === '/sign-in/email' || ctx.path === '/sign-in/username') {
                const email = ctx.body?.email as string | undefined;
                const uname = ctx.body?.username as string | undefined;
                if (!email && !uname) return;

                const usuario = await prisma.user.findFirst({
                    where: email ? { email } : { username: uname },
                    select: { estado: true },
                });

                if (usuario && usuario.estado === false) {
                    throw new APIError('FORBIDDEN', {
                        message: 'Tu cuenta está desactivada. Contacta al administrador.',
                    });
                }
            }
        }),

        // Auditoría: login, logout y acciones del plugin admin.
        after: createAuthMiddleware(async (ctx) => {
            try {
                const headers = ctx.headers;
                const userAgent = headers?.get('user-agent') ?? null;
                const ipAddress =
                    headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ??
                    headers?.get('x-real-ip') ??
                    null;

                const loginPaths = [
                    '/sign-in/email',
                    '/sign-in/username',
                    '/two-factor/verify-totp',
                    '/two-factor/verify-backup-code',
                ];

                // LOGIN
                if (loginPaths.includes(ctx.path) && ctx.context.newSession) {
                    await prisma.auditLog.create({
                        data: {
                            accion: 'LOGIN',
                            usuarioId: ctx.context.newSession.user.id,
                            ipAddress,
                            userAgent,
                        },
                    });
                    return;
                }

                // LOGOUT
                if (ctx.path === '/sign-out') {
                    await prisma.auditLog.create({
                        data: {
                            accion: 'LOGOUT',
                            usuarioId: ctx.context.session?.user?.id ?? null,
                            ipAddress,
                            userAgent,
                        },
                    });
                    return;
                }

                // Cambio de contraseña: limpiar el flag de contraseña temporal.
                if (ctx.path === '/change-password') {
                    const userId = ctx.context.session?.user?.id ?? null;
                    if (userId) {
                        await prisma.user.update({
                            where: { id: userId },
                            data: { mustChangePassword: false },
                        });
                        await prisma.auditLog.create({
                            data: {
                                accion: 'PASSWORD_CHANGED',
                                usuarioId: userId,
                                ipAddress,
                                userAgent,
                            },
                        });
                    }
                    return;
                }

                // Acciones del plugin admin (/admin/ban-user, /admin/set-role, ...)
                if (ctx.path.startsWith('/admin/')) {
                    const accionMap: Record<string, string> = {
                        '/admin/ban-user': 'USER_BANNED',
                        '/admin/unban-user': 'USER_UNBANNED',
                        '/admin/set-role': 'ROLE_CHANGED',
                        '/admin/remove-user': 'USER_DELETED',
                        '/admin/set-user-password': 'PASSWORD_RESET',
                        '/admin/create-user': 'USER_CREATED',
                    };
                    const accion = accionMap[ctx.path];
                    if (!accion) return; // ignorar list-users y similares

                    await prisma.auditLog.create({
                        data: {
                            accion,
                            usuarioId: ctx.context.session?.user?.id ?? null,
                            targetUserId: (ctx.body?.userId as string | undefined) ?? null,
                            ipAddress,
                            userAgent,
                            metadata: {
                                role: ctx.body?.role ?? undefined,
                                banReason: ctx.body?.banReason ?? undefined,
                            },
                        },
                    });

                    // Usuario creado por admin: exigir cambio de contraseña temporal.
                    if (accion === 'USER_CREATED') {
                        const email = ctx.body?.email as string | undefined;
                        if (email) {
                            await prisma.user.updateMany({
                                where: { email },
                                data: { mustChangePassword: true },
                            });
                        }
                    }
                }
            } catch {
                // La auditoría nunca debe romper el flujo de autenticación.
            }
        }),
    },
});