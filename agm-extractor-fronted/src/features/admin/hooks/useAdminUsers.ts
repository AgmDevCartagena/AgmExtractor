import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { admin } from '@/lib/auth-client';
import { apiFetch } from '@/lib/api';

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    banned?: boolean | null;
    banReason?: string | null;
    banExpires?: string | null;
    estado?: boolean | null;
    telefono?: string | null;
    twoFactorEnabled?: boolean | null;
    createdAt: string;
}

export interface ListUsersResult {
    users: AdminUser[];
    total: number;
    limit?: number;
    offset?: number;
}

export const useAdminUsers = (page: number, search: string, limit = 10) =>
    useQuery<ListUsersResult>({
        queryKey: ['admin', 'users', page, search, limit],
        queryFn: async () => {
            const res = await admin.listUsers({
                query: {
                    limit,
                    offset: (page - 1) * limit,
                    sortBy: 'createdAt',
                    sortDirection: 'desc',
                    ...(search
                        ? {
                              searchField: 'email' as const,
                              searchOperator: 'contains' as const,
                              searchValue: search,
                          }
                        : {}),
                },
            });
            if (res.error) throw new Error(res.error.message ?? 'Error listando usuarios');
            return res.data as ListUsersResult;
        },
    });

export interface CreateUserInput {
    name: string;
    email: string;
    password: string;
    telefono: string;
    username: string;
    role: 'admin' | 'user';
}

export const useAdminUserMutations = () => {
    const qc = useQueryClient();
    const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] });

    const createUser = useMutation({
        mutationFn: async ({ name, email, password, telefono, username, role }: CreateUserInput) => {
            const res = await admin.createUser({
                name,
                email,
                password,
                role,
                data: { telefono, username, displayUsername: username },
            });
            if (res.error) throw new Error(res.error.message ?? 'Error creando usuario');
            return res.data;
        },
        onSuccess: invalidate,
    });

    const setRole = useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'user' }) => {
            const res = await admin.setRole({ userId, role });
            if (res.error) throw new Error(res.error.message ?? 'Error cambiando rol');
            return res.data;
        },
        onSuccess: invalidate,
    });

    const banUser = useMutation({
        mutationFn: async ({ userId, banReason }: { userId: string; banReason?: string }) => {
            const res = await admin.banUser({ userId, banReason });
            if (res.error) throw new Error(res.error.message ?? 'Error baneando usuario');
            return res.data;
        },
        onSuccess: invalidate,
    });

    const unbanUser = useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            const res = await admin.unbanUser({ userId });
            if (res.error) throw new Error(res.error.message ?? 'Error desbaneando usuario');
            return res.data;
        },
        onSuccess: invalidate,
    });

    const setPassword = useMutation({
        mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
            const res = await admin.setUserPassword({ userId, newPassword });
            if (res.error) throw new Error(res.error.message ?? 'Error reseteando contraseña');
            return res.data;
        },
    });

    const removeUser = useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            const res = await admin.removeUser({ userId });
            if (res.error) throw new Error(res.error.message ?? 'Error eliminando usuario');
            return res.data;
        },
        onSuccess: invalidate,
    });

    const setEstado = useMutation({
        mutationFn: ({ userId, estado }: { userId: string; estado: boolean }) =>
            apiFetch(`/admin/users/${userId}/estado`, {
                method: 'PATCH',
                body: JSON.stringify({ estado }),
            }),
        onSuccess: invalidate,
    });

    return { createUser, setRole, banUser, unbanUser, setPassword, removeUser, setEstado };
};
