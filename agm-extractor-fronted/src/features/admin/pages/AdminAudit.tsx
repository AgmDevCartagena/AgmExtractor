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
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAdminAudit } from '../hooks/useAdminAudit';

const ACCIONES = [
    'LOGIN',
    'LOGOUT',
    'USER_BANNED',
    'USER_UNBANNED',
    'ROLE_CHANGED',
    'USER_DELETED',
    'USER_ESTADO',
    'PASSWORD_RESET',
    'USER_CREATED',
];

const accionVariant = (accion: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (['USER_BANNED', 'USER_DELETED'].includes(accion)) return 'destructive';
    if (['LOGIN', 'LOGOUT'].includes(accion)) return 'secondary';
    if (['ROLE_CHANGED', 'USER_ESTADO', 'PASSWORD_RESET'].includes(accion)) return 'default';
    return 'outline';
};

export default function AdminAudit() {
    const [page, setPage] = useState(1);
    const [accion, setAccion] = useState('');
    const { data, isLoading, isError } = useAdminAudit(page, accion || undefined);

    const items = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">Auditoría</h2>
                    <p className="text-sm text-muted-foreground">{data?.total ?? 0} eventos registrados.</p>
                </div>
                <select
                    value={accion}
                    onChange={(e) => {
                        setPage(1);
                        setAccion(e.target.value);
                    }}
                    className="h-9 rounded-md border bg-card px-3 text-[13px] text-foreground cursor-pointer"
                >
                    <option value="">Todas las acciones</option>
                    {ACCIONES.map((a) => (
                        <option key={a} value={a}>
                            {a}
                        </option>
                    ))}
                </select>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                        <Loader2 className="animate-spin" size={18} /> Cargando auditoría...
                    </div>
                ) : isError ? (
                    <div className="py-20 text-center text-destructive text-sm">
                        No se pudo cargar la auditoría.
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground text-sm">Sin eventos.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-4">Fecha</TableHead>
                                <TableHead>Acción</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Afectado</TableHead>
                                <TableHead className="pr-4">IP</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((it) => (
                                <TableRow key={it.id}>
                                    <TableCell className="pl-4 text-[12px] text-muted-foreground whitespace-nowrap">
                                        {new Date(it.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={accionVariant(it.accion)}>{it.accion}</Badge>
                                    </TableCell>
                                    <TableCell className="text-[12px]">
                                        {it.usuario ? (
                                            <span className="text-foreground">{it.usuario.email}</span>
                                        ) : (
                                            <span className="text-muted-foreground">sistema</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-[12px] text-muted-foreground font-mono">
                                        {it.targetUserId ? it.targetUserId.slice(0, 8) : '—'}
                                    </TableCell>
                                    <TableCell className="pr-4 text-[12px] text-muted-foreground font-mono">
                                        {it.ipAddress ?? '—'}
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
