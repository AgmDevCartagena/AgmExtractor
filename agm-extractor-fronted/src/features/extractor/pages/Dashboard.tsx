import { signOut, useSession } from '@/lib/auth-client';
import FormularioExtraccion from '../components/FormExtract';
import TablaResultados from '../components/TableResult';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Scale, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
    const { data: session } = useSession();
    const userId = session?.user?.id ?? null;

    const [currentJobId, setCurrentJobId] = useState<string | null>(null);

    const handleCerrarSesion = async () => {
        await signOut();
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] flex">
            <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col sticky top-0 h-screen">
                <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                    <div className="p-2 bg-blue-600 rounded-lg">
                        <Scale size={20} className="text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight">Extractor</h1>
                </div>

                <nav className="flex-1 p-4 space-y-2 mt-4">
                    <button className="flex items-center gap-3 w-full px-4 py-3 bg-blue-600/10 text-blue-400 rounded-xl text-sm font-medium transition-all">
                        <LayoutDashboard size={18} />
                        Dashboard
                    </button>

                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="bg-slate-800/50 p-4 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                            {session?.user?.name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{session?.user?.name || 'Usuario'}</p>
                            <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
                        <div className="flex items-center gap-4 lg:hidden">
                            <div className="p-1.5 bg-blue-600 rounded-lg">
                                <Scale size={18} className="text-white" />
                            </div>
                            <h1 className="text-lg font-bold text-slate-900">Extractor</h1>
                        </div>

                        <div className="hidden lg:block">
                            <h2 className="text-lg font-semibold text-slate-800">Dashboard General</h2>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCerrarSesion}
                                className="gap-2 text-slate-600 border-slate-200 hover:text-red-600 hover:border-red-100 hover:bg-red-50"
                            >
                                <LogOut size={16} />
                                <span className="hidden sm:inline">Cerrar Sesión</span>
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
                    {/* Welcome Banner */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                            Hola, {session?.user?.name?.split(' ')[0] || 'Bienvenido'}
                        </h1>
                        <p className="text-slate-500">
                            Aquí tienes un resumen de tus procesos y extracciones pendientes.
                        </p>
                    </div>

                    {/* Banner Informativo si hay proceso */}
                    {currentJobId && (
                        <div className="mb-8 bg-blue-600 text-white p-4 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 p-2 rounded-lg animate-pulse">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                </div>
                                <div>
                                    <p className="font-semibold">Extracción en curso</p>
                                    <p className="text-blue-100 text-sm">ID del proceso: <span className="font-mono">{currentJobId}</span></p>
                                </div>
                            </div>
                            <Button variant="ghost" className="text-white hover:bg-white/10 hidden sm:flex">
                                Ver Detalles
                            </Button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                        {/* Columna Izquierda: Formulario (4/12) */}
                        <div className="xl:col-span-4">
                            <div className="sticky top-24">
                                <FormularioExtraccion onJobCreated={setCurrentJobId} />
                            </div>
                        </div>

                        {/* Columna Derecha: Tabla (8/12) */}
                        <div className="xl:col-span-8">
                            <TablaResultados userId={userId} />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}