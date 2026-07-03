import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession, signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
    Radar,
    LayoutDashboard,
    Users,
    ScrollText,
    Activity,
    ArrowLeft,
    LogOut,
} from 'lucide-react';

const navItems = [
    { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
    { to: '/admin/usuarios', label: 'Usuarios', icon: Users, end: false },
    { to: '/admin/auditoria', label: 'Auditoría', icon: ScrollText, end: false },
    { to: '/admin/ejecuciones', label: 'Ejecuciones', icon: Activity, end: false },
];

export default function AdminLayout() {
    const { data: session } = useSession();
    const navigate = useNavigate();

    const handleCerrarSesion = async () => {
        await signOut();
        window.location.reload();
    };

    return (
        <div className="min-h-dvh bg-background flex flex-col">
            <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
                <div className="max-w-400 mx-auto px-6 h-14 flex justify-between items-center w-full">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-primary rounded-md ring-1 ring-primary/30 shadow-sm">
                            <Radar size={15} className="text-primary-foreground" />
                        </div>
                        <h1 className="text-sm font-semibold text-foreground tracking-tight">
                            RADAR <span className="text-muted-foreground font-normal">· Admin</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="hidden sm:block text-right">
                                <p className="text-[13px] font-medium text-foreground leading-tight">
                                    {session?.user?.name || 'Admin'}
                                </p>
                                <p className="text-[11px] text-muted-foreground leading-tight">
                                    {session?.user?.email}
                                </p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold border border-primary/20">
                                {session?.user?.name?.[0] || 'A'}
                            </div>
                        </div>

                        <div className="w-px h-5 bg-border hidden sm:block" />

                        <ThemeToggle />

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/')}
                            className="gap-2 h-8 text-[13px] text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer"
                        >
                            <ArrowLeft size={14} />
                            <span className="hidden sm:inline">Volver a la app</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCerrarSesion}
                            className="gap-2 h-8 text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive/5 cursor-pointer"
                        >
                            <LogOut size={14} />
                            <span className="hidden sm:inline">Cerrar sesion</span>
                        </Button>
                    </div>
                </div>
            </header>

            <div className="flex-1 max-w-400 mx-auto w-full flex flex-col md:flex-row">
                <aside className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r p-3 md:p-4">
                    <nav className="flex md:flex-col gap-1 overflow-x-auto">
                        {navItems.map(({ to, label, icon: Icon, end }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={end}
                                className={({ isActive }) =>
                                    `flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                                        isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                    }`
                                }
                            >
                                <Icon size={16} />
                                {label}
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 p-4 md:p-6 lg:p-8 min-w-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
