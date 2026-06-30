import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminExecutions } from '../hooks/useAdminExecutions';
import { usePerformance } from '../hooks/useAdminMetrics';

const fmtMs = (ms: number | null) => {
    if (ms == null) return '—';
    if (ms < 1000) return `${ms} ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)} s`;
    return `${(s / 60).toFixed(1)} min`;
};

const ESTADOS: Record<string, string> = {
    RUNNING: 'Corriendo',
    SUCCESS: 'Completado',
    FAILED: 'Fallido',
};

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const v = s.toLowerCase();
    if (v === 'success') return 'secondary';
    if (v === 'failed') return 'destructive';
    return 'outline';
};

export default function AdminExecutions() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const { data, isLoading, isError } = useAdminExecutions(page, status || undefined);
    const { data: perf } = usePerformance();

    const items = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground">Ejecuciones</h2>
                <p className="text-sm text-muted-foreground">Rendimiento de las extracciones.</p>
            </div>

            {/* Resumen de rendimiento */}
            {perf && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Summary label="Total" value={perf.total} />
                    <Summary label="% Éxito" value={`${perf.pctExito}%`} />
                    <Summary label="Duración media" value={fmtMs(perf.duracionMediaMs)} />
                    <Summary label="Procesos/corrida" value={perf.procesosPorCorrida} />
                    <Summary label="Rendimiento" value={perf.throughput24h} />
                </div>
            )}

            <div className="flex justify-end">
                <select
                    value={status}
                    onChange={(e) => {
                        setPage(1);
                        setStatus(e.target.value);
                    }}
                    className="h-9 rounded-md border bg-card px-3 text-[13px] text-foreground cursor-pointer"
                >
                    <option value="">Todos los estados</option>
                    {Object.entries(ESTADOS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                        <Loader2 className="animate-spin" size={18} /> Cargando ejecuciones...
                    </div>
                ) : isError ? (
                    <div className="py-20 text-center text-destructive text-sm">
                        No se pudieron cargar las ejecuciones.
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground text-sm">Sin ejecuciones.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-4">Inicio</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Duración</TableHead>
                                <TableHead>Procesos</TableHead>
                                <TableHead className="pr-4">Error</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((it) => (
                                <TableRow key={it.id}>
                                    <TableCell className="pl-4 text-[12px] text-muted-foreground whitespace-nowrap">
                                        {new Date(it.startedAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{it.tipo}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant(it.status)}>{ESTADOS[it.status] ?? it.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-[12px]">{fmtMs(it.durationMs)}</TableCell>
                                    <TableCell className="text-[12px]">{it.procesosEncontrados}</TableCell>
                                    <TableCell className="pr-4 text-[12px] text-destructive max-w-50 truncate" title={it.error ?? ''}>
                                        {it.error ?? '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Página {page} de {totalPages}
                </p>
                <div className="flex gap-1.5">
                    <Button variant="outline" size="sm" className="h-8 cursor-pointer" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                        <ChevronLeft size={15} />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 cursor-pointer" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        <ChevronRight size={15} />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function Summary({ label, value }: { label: string; value: string | number }) {
    return (
        <Card>
            <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
                <p className="text-lg font-semibold text-foreground">{value}</p>
            </CardContent>
        </Card>
    );
}
