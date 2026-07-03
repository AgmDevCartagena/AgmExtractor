import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface AuditLogItem {
    id: string;
    accion: string;
    usuarioId: string | null;
    targetUserId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    usuario: { id: string; nombre: string; email: string } | null;
}

export interface AuditResponse {
    items: AuditLogItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const useAdminAudit = (page: number, accion?: string, limit = 20) =>
    useQuery<AuditResponse>({
        queryKey: ['admin', 'audit', page, accion, limit],
        queryFn: () => {
            const params = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (accion) params.set('accion', accion);
            return apiFetch(`/admin/audit?${params.toString()}`);
        },
    });
