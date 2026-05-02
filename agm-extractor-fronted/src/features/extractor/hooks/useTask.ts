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

export const useResultadosExtraccion = (userId: string | null, page = 1, limit = 10) => {
    return useQuery<ProcesoJudicial[]>({
        queryKey: ['resultados', userId, page, limit],
        queryFn: () => apiFetch(`/extractor/schedule/${userId}?page=${page}&limit=${limit}`),
        enabled: !!userId,
        refetchInterval: userId ? 15000 : false,
    });
};