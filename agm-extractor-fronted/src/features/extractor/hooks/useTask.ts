import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch, apiDownload } from '../../../lib/api';

export type FrecuenciaPermitida = '3min' | '15min' | '30min' | '1h' | '12h' | '1d' | '2d' | '3d';

export interface ScheduleParamsDto {
    parteProcesal: string;
    juzgado: string;
    frecuencia: FrecuenciaPermitida;
}

export interface ProcesoJudicial {
    id: string;
    radicado: string;
    tipoProceso: string;
    ponente: string;
    demandante: string;
    textoCompleto: string;
    fechaDescubrimiento: string;
    detalleExtraido: boolean;
}

export interface Actuacion {
    id: string;
    indice: string | null;
    fechaRegistro: string | null;
    fechaActuacion: string | null;
    actuacion: string | null;
    anotacion: string | null;
    estado: string | null;
    anexos: number;
}

export interface ProcesoDetalle extends ProcesoJudicial {
    corporacion: string | null;
    clase: string | null;
    subclase: string | null;
    marcoLegal: string | null;
    vigente: boolean | null;
    salaConoce: string | null;
    salaDecide: string | null;
    fechaRadicado: string | null;
    fechaPresentacion: string | null;
    sentencia: string | null;
    asunto: string | null;
    origen: string | null;
    recurso: string | null;
    naturaleza: string | null;
    ubicacion: string | null;
    etapa: string | null;
    formatoExpediente: string | null;
    actuaciones: Actuacion[];
}

export interface ScheduledTask {
    id: string;
    parteProcesal: string;
    juzgado: string;
    frecuencia: FrecuenciaPermitida;
    createdAt: string;
    ultimaEjecucion: string | null;
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

export const useExportarUltimaActuacion = () => {
    return useMutation({
        mutationFn: () =>
            apiDownload('/extractor/export/ultima-actuacion', 'ultima-actuacion.xlsx'),
    });
};

export const useDetalleProceso = (procesoId: string | null) =>
    useQuery<ProcesoDetalle>({
        queryKey: ['detalleProceso', procesoId],
        queryFn: () => apiFetch(`/extractor/proceso/${procesoId}`),
        enabled: !!procesoId,
        staleTime: 5 * 60 * 1000,
    });