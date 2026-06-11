import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api';
import { type FrecuenciaPermitida } from './useTask';

export interface ScheduleRadicadoDto {
    radicado: string;
    juzgado: string;
    frecuencia: FrecuenciaPermitida;
}

export interface RadicadoTask {
    id: string;
    radicado: string;
    juzgado: string;
    frecuencia: FrecuenciaPermitida;
    createdAt: string;
    ultimaEjecucion: string | null;
}

export interface PaginatedRadicadoTasksResponse {
    data: RadicadoTask[];
    meta: {
        total: number;
        page: number;
        last_page: number;
    };
}

export const useProgramarRadicado = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: ScheduleRadicadoDto) =>
            apiFetch('/extractor/radicado/schedule', {
                method: 'POST',
                body: JSON.stringify(params),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tareasRadicado'] });
        },
    });
};

export const useCancelarRadicado = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (jobId: string) =>
            apiFetch(`/extractor/radicado/schedule/${jobId}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tareasRadicado'] });
        },
    });
};

export const useTareasRadicado = (userId: string | null | undefined, page = 1, limit = 10) => {
    return useQuery<PaginatedRadicadoTasksResponse>({
        queryKey: ['tareasRadicado', userId, page, limit],
        queryFn: () => apiFetch(`/extractor/radicado/schedule/tasks?page=${page}&limit=${limit}`),
        enabled: !!userId,
        refetchInterval: userId ? 15000 : false,
    });
};

export const useResultadosRadicado = (
    userId: string | null | undefined,
    radicadoTaskId: string | null,
    page = 1,
    limit = 10
) => {
    return useQuery({
        queryKey: ['resultadosRadicado', userId, radicadoTaskId, page, limit],
        queryFn: () => {
            let url = `/extractor/radicado/schedule?page=${page}&limit=${limit}`;
            if (radicadoTaskId) url += `&radicadoTaskId=${radicadoTaskId}`;
            return apiFetch(url);
        },
        enabled: !!userId,
        refetchInterval: userId ? 15000 : false,
    });
};
