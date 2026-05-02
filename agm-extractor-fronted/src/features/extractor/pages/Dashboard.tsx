import { signOut, useSession } from '@/lib/auth-client';
import FormularioExtraccion from '../components/FormExtract';
import TablaResultados from '../components/TableResult';
import ListaTareas from '../components/ListTask';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Scale, LayoutDashboard, Plus, X } from 'lucide-react';

export default function Dashboard() {
    const { data: session } = useSession();
    const userId = session?.user?.id ?? null;

    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                                onClick={() => setIsModalOpen(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 gap-2"
                            >
                                <Plus size={18} />
                                <span className="hidden sm:inline">Nuevo Radar</span>
                            </Button>

                            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

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
                <main className="flex-1 p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        {/* Control Center (Left) */}
                        <div className="lg:col-span-4 sticky top-24">
                            {/* Active Radars List - NOW ON TOP */}
                            <ListaTareas
                                userId={userId || undefined}
                                tareaSeleccionada={selectedTaskId}
                                onSelectTarea={setSelectedTaskId}
                            />
                        </div>

                        {/* Results Area (Right) */}
                        <div className="lg:col-span-8 space-y-6">
                            {/* Status Banner */}
                            {currentJobId && (
                                <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/20 p-2.5 rounded-xl animate-pulse">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">Extracción en curso</p>
                                            <p className="text-blue-100 text-[11px] font-mono">ID: {currentJobId}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 font-bold text-xs uppercase tracking-wider">
                                        Monitorear
                                    </Button>
                                </div>
                            )}

                            {/* Main Table */}
                            <div className="min-h-[600px]">
                                <TablaResultados userId={userId || undefined} taskId={selectedTaskId} />
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal de Nueva Extracción */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Configurar Nuevo Radar</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-full hover:bg-slate-200"
                            >
                                <X size={18} className="text-slate-500" />
                            </Button>
                        </div>
                        <div className="p-1">
                            <FormularioExtraccion onJobCreated={(id) => {
                                if (id) setCurrentJobId(id);
                                setIsModalOpen(false);
                            }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}