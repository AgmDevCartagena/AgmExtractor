import { useState } from 'react';
import { toast } from 'sonner';
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
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    Search,
    Loader2,
    ShieldCheck,
    ShieldOff,
    Ban,
    CircleCheck,
    Power,
    PowerOff,
    KeyRound,
    Trash2,
    ChevronLeft,
    ChevronRight,
    UserPlus,
} from 'lucide-react';
import {
    useAdminUsers,
    useAdminUserMutations,
    type AdminUser,
} from '../hooks/useAdminUsers';
import CreateUserDialog from '../components/CreateUserDialog';

interface PendingAction {
    title: string;
    description: string;
    destructive: boolean;
    confirmText: string;
    run: () => Promise<unknown>;
}

export default function AdminUsers() {
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 10;

    const { data, isLoading, isError } = useAdminUsers(page, search, limit);
    const m = useAdminUserMutations();
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    const submitSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        setSearch(searchInput.trim());
    };

    const run = async (label: string, fn: () => Promise<unknown>) => {
        try {
            await fn();
            toast.success(label);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Error en la operación');
        }
    };

    const handleResetPassword = (u: AdminUser) => {
        const pwd = window.prompt(`Nueva contraseña para ${u.email} (mín. 8 caracteres):`);
        if (!pwd) return;
        if (pwd.length < 8) {
            toast.error('La contraseña debe tener al menos 8 caracteres.');
            return;
        }
        run('Contraseña actualizada', () => m.setPassword.mutateAsync({ userId: u.id, newPassword: pwd }));
    };

    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const users = data?.users ?? [];

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">Usuarios</h2>
                    <p className="text-sm text-muted-foreground">{total} usuarios registrados.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <form onSubmit={submitSearch} className="flex gap-2 flex-1">
                        <div className="relative flex-1 sm:w-64">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Buscar por email..."
                                className="pl-8 h-9"
                            />
                        </div>
                        <Button type="submit" variant="outline" size="sm" className="h-9 cursor-pointer">Buscar</Button>
                    </form>
                    <Button size="sm" onClick={() => setCreateOpen(true)} className="h-9 gap-1.5 cursor-pointer shrink-0">
                        <UserPlus size={15} />
                        <span className="hidden sm:inline">Registrar</span>
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                        <Loader2 className="animate-spin" size={18} /> Cargando usuarios...
                    </div>
                ) : isError ? (
                    <div className="py-20 text-center text-destructive text-sm">
                        No se pudieron cargar los usuarios.
                    </div>
                ) : users.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground text-sm">
                        No hay usuarios que coincidan.
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-4">Usuario</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead className="text-right pr-4">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((u) => {
                                const esAdmin = u.role === 'admin';
                                const baneado = !!u.banned;
                                const activo = u.estado !== false;
                                return (
                                    <TableRow key={u.id}>
                                        <TableCell className="pl-4">
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-medium text-foreground truncate">
                                                    {u.name || '—'}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                <Badge variant={activo ? 'secondary' : 'destructive'}>
                                                    {activo ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                                {baneado && <Badge variant="destructive">Baneado</Badge>}
                                                {u.twoFactorEnabled && <Badge variant="outline">2FA</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={esAdmin ? 'default' : 'outline'}>
                                                {esAdmin ? 'admin' : 'user'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="pr-4">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Activar / desactivar estado */}
                                                <IconBtn
                                                    title={activo ? 'Desactivar' : 'Activar'}
                                                    onClick={() =>
                                                        run(
                                                            activo ? 'Usuario desactivado' : 'Usuario activado',
                                                            () => m.setEstado.mutateAsync({ userId: u.id, estado: !activo }),
                                                        )
                                                    }
                                                >
                                                    {activo ? <PowerOff size={15} /> : <Power size={15} />}
                                                </IconBtn>

                                                {/* Cambiar rol */}
                                                <IconBtn
                                                    title={esAdmin ? 'Quitar admin' : 'Hacer admin'}
                                                    onClick={() =>
                                                        run('Rol actualizado', () =>
                                                            m.setRole.mutateAsync({
                                                                userId: u.id,
                                                                role: esAdmin ? 'user' : 'admin',
                                                            }),
                                                        )
                                                    }
                                                >
                                                    {esAdmin ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                                                </IconBtn>

                                                {/* Banear / desbanear */}
                                                <IconBtn
                                                    title={baneado ? 'Desbanear' : 'Banear'}
                                                    onClick={() => {
                                                        if (baneado) {
                                                            run('Usuario desbaneado', () =>
                                                                m.unbanUser.mutateAsync({ userId: u.id }),
                                                            );
                                                        } else {
                                                            setPending({
                                                                title: `Banear a ${u.email}`,
                                                                description: 'El usuario no podrá iniciar sesión hasta ser desbaneado.',
                                                                destructive: true,
                                                                confirmText: 'Banear',
                                                                run: () => m.banUser.mutateAsync({ userId: u.id }),
                                                            });
                                                        }
                                                    }}
                                                >
                                                    {baneado ? <CircleCheck size={15} /> : <Ban size={15} />}
                                                </IconBtn>

                                                {/* Resetear contraseña */}
                                                <IconBtn title="Resetear contraseña" onClick={() => handleResetPassword(u)}>
                                                    <KeyRound size={15} />
                                                </IconBtn>

                                                {/* Eliminar */}
                                                <IconBtn
                                                    title="Eliminar"
                                                    destructive
                                                    onClick={() =>
                                                        setPending({
                                                            title: `Eliminar a ${u.email}`,
                                                            description: 'Esta acción es permanente y no se puede deshacer.',
                                                            destructive: true,
                                                            confirmText: 'Eliminar',
                                                            run: () => m.removeUser.mutateAsync({ userId: u.id }),
                                                        })
                                                    }
                                                >
                                                    <Trash2 size={15} />
                                                </IconBtn>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Página {page} de {totalPages}
                </p>
                <div className="flex gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 cursor-pointer"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        <ChevronLeft size={15} />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 cursor-pointer"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        <ChevronRight size={15} />
                    </Button>
                </div>
            </div>

            <ConfirmDialog
                open={!!pending}
                title={pending?.title ?? ''}
                description={pending?.description}
                confirmText={pending?.confirmText}
                destructive={pending?.destructive}
                onCancel={() => setPending(null)}
                onConfirm={async () => {
                    const action = pending;
                    setPending(null);
                    if (action) await run(`${action.confirmText} completado`, action.run);
                }}
            />

            <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
        </div>
    );
}

function IconBtn({
    title,
    onClick,
    destructive,
    children,
}: {
    title: string;
    onClick: () => void;
    destructive?: boolean;
    children: React.ReactNode;
}) {
    return (
        <Button
            variant="ghost"
            size="icon"
            title={title}
            onClick={onClick}
            className={`h-8 w-8 cursor-pointer ${
                destructive
                    ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/5'
                    : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
            }`}
        >
            {children}
        </Button>
    );
}
