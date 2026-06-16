import { useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users,
    ShieldCheck,
    Radar,
    Activity,
    Loader2,
} from 'lucide-react';
import { useOverview, usePerformance, useTimeseries } from '../hooks/useAdminMetrics';

function Kpi({
    icon: Icon,
    label,
    value,
    hint,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    value: string | number;
    hint?: string;
}) {
    return (
        <Card>
            <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon size={17} />
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                        {label}
                    </p>
                    <p className="text-xl font-semibold text-foreground leading-tight">{value}</p>
                    {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
                </div>
            </CardContent>
        </Card>
    );
}

const fmtMs = (ms: number) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms} ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)} s`;
    return `${(s / 60).toFixed(1)} min`;
};

export default function AdminOverview() {
    const { data: ov, isLoading, isError } = useOverview();
    const { data: perf } = usePerformance();
    const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');
    const { data: signups } = useTimeseries('signups', range);
    const { data: execs } = useTimeseries('executions', range);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
                <Loader2 className="animate-spin" size={18} /> Cargando métricas...
            </div>
        );
    }

    if (isError || !ov) {
        return (
            <div className="flex items-center justify-center py-24 text-destructive text-sm">
                No se pudieron cargar las métricas.
            </div>
        );
    }

    const perfBars = perf
        ? [
              { name: 'Éxito', value: perf.exito, color: 'var(--color-primary)' },
              { name: 'Fallo', value: perf.fallo, color: 'var(--color-destructive)' },
              { name: 'Corriendo', value: perf.corriendo, color: 'var(--color-muted-foreground)' },
          ]
        : [];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Resumen</h2>
                <p className="text-sm text-muted-foreground">Métricas del sistema en tiempo real.</p>
            </div>

            {/* KPIs principales */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi
                    icon={Users}
                    label="Usuarios"
                    value={ov.usuarios.total}
                    hint={`${ov.usuarios.activos} activos · ${ov.usuarios.baneados} baneados · ${ov.usuarios.nuevos30d} nuevos (30d)`}
                />
                <Kpi
                    icon={ShieldCheck}
                    label="Seguridad"
                    value={`${ov.usuarios.pct2FA}% 2FA`}
                    hint={`${ov.usuarios.con2FA} con 2FA · ${ov.sesiones.activas} sesiones activas`}
                />
                <Kpi
                    icon={Activity}
                    label="Ejecuciones 24h"
                    value={ov.ejecuciones.ult24h}
                    hint={`${ov.ejecuciones.pctExito24h}% éxito · media ${fmtMs(ov.ejecuciones.duracionMediaMs)}`}
                />
                <Kpi
                    icon={Radar}
                    label="Operación"
                    value={`${ov.radares.activos} radares`}
                    hint={`${ov.procesos.total} procesos · ${ov.actuaciones.total} actuaciones`}
                />
            </div>

            {/* Selector de rango */}
            <div className="flex items-center gap-2">
                {(['7d', '30d', '90d'] as const).map((r) => (
                    <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                            range === r
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground hover:bg-muted/70'
                        }`}
                    >
                        {r}
                    </button>
                ))}
            </div>

            {/* Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-sm">Registros de usuarios</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={signups ?? []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-card)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 8,
                                        fontSize: 12,
                                    }}
                                />
                                <Line type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 pb-0">
                        <CardTitle className="text-sm">Ejecuciones por día</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={execs ?? []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                                <Tooltip
                                    contentStyle={{
                                        background: 'var(--color-card)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 8,
                                        fontSize: 12,
                                    }}
                                />
                                <Line type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {perf && (
                    <Card>
                        <CardHeader className="p-4 pb-0">
                            <CardTitle className="text-sm">
                                Rendimiento de ejecuciones · {perf.pctExito}% éxito
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={perfBars}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--color-card)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 8,
                                            fontSize: 12,
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                        {perfBars.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
