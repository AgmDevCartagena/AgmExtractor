import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface OverviewMetrics {
    usuarios: {
        total: number;
        activos: number;
        inactivos: number;
        baneados: number;
        nuevos7d: number;
        nuevos30d: number;
        con2FA: number;
        pct2FA: number;
    };
    sesiones: { activas: number };
    radares: { total: number; activos: number; porParte: number; porRadicado: number };
    procesos: {
        total: number;
        nuevos7d: number;
        nuevos30d: number;
        conDetalle: number;
        pctConDetalle: number;
    };
    actuaciones: { total: number };
    ejecuciones: {
        ult24h: number;
        ult24hExito: number;
        pctExito24h: number;
        ult7d: number;
        ult7dExito: number;
        pctExito7d: number;
        duracionMediaMs: number;
    };
}

export interface PerformanceMetrics {
    total: number;
    exito: number;
    fallo: number;
    corriendo: number;
    pctExito: number;
    duracionMediaMs: number;
    procesosPorCorrida: number;
    throughput24h: number;
}

export interface TimeseriesPoint {
    date: string;
    count: number;
}

export const useOverview = () =>
    useQuery<OverviewMetrics>({
        queryKey: ['admin', 'overview'],
        queryFn: () => apiFetch('/admin/metrics/overview'),
        refetchInterval: 30000,
    });

export const usePerformance = () =>
    useQuery<PerformanceMetrics>({
        queryKey: ['admin', 'performance'],
        queryFn: () => apiFetch('/admin/metrics/performance'),
        refetchInterval: 30000,
    });

export const useTimeseries = (
    metric: 'signups' | 'executions' | 'procesos',
    range: '7d' | '30d' | '90d' = '30d',
) =>
    useQuery<TimeseriesPoint[]>({
        queryKey: ['admin', 'timeseries', metric, range],
        queryFn: () => apiFetch(`/admin/metrics/timeseries?metric=${metric}&range=${range}`),
    });
