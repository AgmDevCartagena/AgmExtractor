import { signOut, useSession } from '@/lib/auth-client';
import FormularioExtraccion from '../components/FormExtract';
import TablaResultados from '../components/TableResult';
import ListaTareas from '../components/ListTask';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Scale, Plus, X } from 'lucide-react';

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
        <div className="min-h-screen bg-[#f8fafc] flex flex-col">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto px-6 h-16 flex justify-between items-center w-full">
                    <div className="flex items-center gap-4">
                        <div className="p-1.5 bg-blue-600 rounded-lg">
                            <Scale size={18} className="text-white" />
                        </div>
                        <h1 className="text-lg font-bold text-slate-900">Extractor</h1>
                        <div className="hidden lg:block border-l border-slate-200 h-6 mx-2"></div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* User Profile */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-semibold text-slate-800 leading-tight">{session?.user?.name || 'Usuario'}</p>
                                <p className="text-xs text-slate-500">{session?.user?.email}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                                {session?.user?.name?.[0] || 'U'}
                            </div>
                        </div>

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
                    <div className="lg:col-span-4 lg:sticky lg:top-24 mb-6 lg:mb-0 space-y-6">
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 gap-2 h-12 rounded-xl text-base"
                        >
                            <Plus size={20} />
                            Nuevo Radar
                        </Button>

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