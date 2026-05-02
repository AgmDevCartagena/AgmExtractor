import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../lib/api';

export type FrecuenciaPermitida = '3min' | '15min' | '30min' | '1h' | '12h' | '1d' | '2d' | '3d';

export interface ScheduleParamsDto {
    parteProcesal: string;
    juzgado: string;
    frecuencia: FrecuenciaPermitida;
}

export interface ProcesoJudicial {
    radicado: string;
    tipoProceso: string;
    ponente: string;
    demandante: string;
    textoCompleto: string;
    fechaDescubrimiento: string,
}

export interface ScheduledTask {
    id: string;
    parteProcesal: string;
    juzgado: string;
    frecuencia: FrecuenciaPermitida;
    createdAt: string;
}


export interface PaginatedTasksResponse {
    data: ScheduledTask[];
    meta: {
        total: number;
        page: number;
        last_page: number;
    };
}

export const useProgramarTarea = () => {
    return useMutation({
        mutationFn: (nuevaTarea: ScheduleParamsDto) =>
            apiFetch('/extractor/schedule', {
                method: 'POST',
                body: JSON.stringify(nuevaTarea),
            }),
    });
};

export const useCancelarTarea = () => {
    return useMutation({
        mutationFn: (tareaId: string) =>
            apiFetch(`/extractor/schedule/${tareaId}`, {
                method: 'DELETE',
            }),
    });
};

export const useResultadosExtraccion = (
    userId: string | null | undefined,
    taskId: string | null,
    page = 1,
    limit = 10
) => {
    return useQuery<PaginatedTasksResponse>({
        queryKey: ['resultados', userId, taskId, page, limit],
        queryFn: () => {
            let url = `/extractor/schedule?page=${page}&limit=${limit}`;
            if (taskId) {
                url += `&taskId=${taskId}`;
            }
            return apiFetch(url);
        },
        enabled: !!userId,
        refetchInterval: userId ? 15000 : false,
    });
};

export const useTareasProgramadas = (userId: string | null, page = 1, limit = 10) => {
    return useQuery<PaginatedTasksResponse>({
        queryKey: ['tareasProgramadas', userId, page, limit],
        queryFn: () => apiFetch(`/extractor/schedule/tasks/${userId}?page=${page}&limit=${limit}`),
        enabled: !!userId,
        refetchInterval: userId ? 15000 : false,
    })
}