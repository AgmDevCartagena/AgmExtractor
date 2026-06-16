import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface ExecutionItem {
    id: string;
    tipo: string;
    refId: string;
    userId: string | null;
    status: 'RUNNING' | 'SUCCESS' | 'FAILED';
    startedAt: string;
    finishedAt: string | null;
    durationMs: number | null;
    procesosEncontrados: number;
    error: string | null;
}

export interface ExecutionsResponse {
    items: ExecutionItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const useAdminExecutions = (page: number, status?: string, limit = 20) =>
    useQuery<ExecutionsResponse>({
        queryKey: ['admin', 'executions', page, status, limit],
        queryFn: () => {
            const params = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (status) params.set('status', status);
            return apiFetch(`/admin/executions?${params.toString()}`);
        },
        refetchInterval: 15000,
    });
