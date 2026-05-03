import { useState } from 'react';
import { useTareasProgramadas, useCancelarTarea } from '../hooks/useTask';
import { Radar, Clock, ChevronRight, Activity, FilterX, AlertCircle, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ListaTareasProps {
    userId: string | undefined;
    tareaSeleccionada: string | null;
    onSelectTarea: (id: string | null) => void;
}

export default function ListaTareas({ userId, tareaSeleccionada, onSelectTarea }: ListaTareasProps) {
    const [page, setPage] = useState(1);
    const limit = 8;
    const queryClient = useQueryClient();

    const { data: response, isLoading, isError } = useTareasProgramadas(userId || null, page, limit);
    const cancelarMutation = useCancelarTarea();

    const handleEliminarTarea = (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Evitar seleccionar la tarea al hacer clic en eliminar
        
        if (window.confirm('¿Estás seguro de que deseas detener y eliminar este radar?')) {
            const loadingToast = toast.loading('Eliminando radar...');
            cancelarMutation.mutate(id, {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ['tareasProgramadas'] });
                    if (tareaSeleccionada === id) {
                        onSelectTarea(null);
                    }
                    toast.success('Radar eliminado correctamente', { id: loadingToast });
                },
                onError: (error) => {
                    toast.error(error.message || 'Hubo un error al eliminar el radar', { id: loadingToast });
                }
            });
        }
    };

    if (!userId) return null;

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 animate-pulse">
                        <div className="h-4 bg-slate-100 rounded w-3/4 mb-3"></div>
                        <div className="h-3 bg-slate-50 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6 bg-red-50/50 border border-red-100 rounded-2xl text-center">
                <AlertCircle className="mx-auto text-red-500 mb-2" size={24} />
                <p className="text-sm font-medium text-red-800">Error al sincronizar radares</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-2 text-xs text-red-600 underline"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    const tareas = response?.data || [];
    const meta = response?.meta;

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Radar size={16} className="text-blue-600" />
                        Radares Activos
                    </h2>
                    {tareaSeleccionada && (
                        <button 
                            onClick={() => onSelectTarea(null)}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                        >
                            <FilterX size={12} />
                            LIMPIAR
                        </button>
                    )}
                </div>
                <p className="text-xs text-slate-500">Monitoreo en tiempo real de procesos</p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[300px] lg:max-h-[500px] custom-scrollbar">
                {tareas.length === 0 ? (
                    <div className="py-12 px-6 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                            <PlusCircle size={20} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-600 mb-1">Sin radares activos</p>
                        <p className="text-xs text-slate-400">Configura tu primera búsqueda para comenzar el monitoreo.</p>
                    </div>
                ) : (
                    tareas.map((tarea) => (
                        <div
                            key={tarea.id}
                            onClick={() => onSelectTarea(tarea.id)}
                            className={`group relative p-4 rounded-xl border transition-all duration-300 cursor-pointer overflow-hidden
                                ${tareaSeleccionada === tarea.id
                                    ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100'
                                    : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md hover:bg-slate-50/50'
                                }`}
                        >
                            <div className={`absolute top-0 left-0 w-1 h-full transition-all duration-300
                                ${tareaSeleccionada === tarea.id ? 'bg-blue-600' : 'bg-transparent group-hover:bg-blue-300'}`} 
                            />

                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-800 text-[13px] truncate uppercase tracking-tight">
                                            {tarea.parteProcesal}
                                        </h4>
                                        {tareaSeleccionada === tarea.id && (
                                            <Activity size={12} className="text-blue-600 animate-pulse shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate leading-relaxed">
                                        {tarea.juzgado}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={(e) => handleEliminarTarea(e, tarea.id)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        title="Eliminar Radar"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    <ChevronRight 
                                        size={14} 
                                        className={`transition-transform duration-300 ${tareaSeleccionada === tarea.id ? 'text-blue-600 translate-x-1' : 'text-slate-300 group-hover:text-slate-400'}`} 
                                    />
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-100/60 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Clock size={10} className="text-slate-400" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                                        {tarea.frecuencia}
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(tarea.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {meta && meta.last_page > 1 && (
                <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setPage(p => Math.max(1, p - 1)); }}
                        disabled={page === 1}
                        className="h-8 px-2 text-[11px] font-bold text-slate-600 hover:bg-white"
                    >
                        ANT.
                    </Button>
                    <span className="text-[10px] font-bold text-slate-400">
                        {meta.page} / {meta.last_page}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setPage(p => Math.min(meta.last_page, p + 1)); }}
                        disabled={page === meta.last_page}
                        className="h-8 px-2 text-[11px] font-bold text-slate-600 hover:bg-white"
                    >
                        SIG.
                    </Button>
                </div>
            )}
        </div>
    );
}