import { useState } from 'react';
import { useTareasProgramadas, useCancelarTarea } from '../hooks/useTask';
import { Radar, ChevronLeft, ChevronRight, AlertCircle, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ScheduledTask } from '../hooks/useTask';

interface ListaTareasProps {
  userId: string | undefined;
  tareaSeleccionada: string | null;
  onSelectTarea: (id: string | null, hasRun?: boolean) => void;
  onNuevoRadar?: () => void;
}

function TareaSkeleton() {
  return (
    <div className="px-3 py-2.5 animate-pulse space-y-1.5">
      <div className="h-3.5 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted/60 rounded w-1/2" />
    </div>
  );
}

function TareaRow({
  tarea,
  isSelected,
  onSelect,
  onDelete,
}: {
  tarea: ScheduledTask;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const partes = Array.isArray(tarea.parteProcesal)
    ? tarea.parteProcesal.join(', ')
    : tarea.parteProcesal;
  const hasRun = tarea.ultimaEjecucion != null;

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-md cursor-pointer transition-colors
        ${isSelected
          ? 'bg-accent ring-1 ring-primary/20'
          : 'hover:bg-muted/60'
        }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          hasRun ? 'bg-success' : 'bg-warning animate-pulse-soft'
        }`}
        title={hasRun ? 'Radar activo' : 'Pendiente de primera ejecucion'}
      />

      <div className="flex-1 min-w-0">
        <p
          className={`text-[13px] font-medium truncate leading-tight ${isSelected ? 'text-accent-foreground' : 'text-foreground'}`}
          title={partes}
        >
          {partes}
        </p>
        <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
          {tarea.juzgado}
        </p>
      </div>

      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded shrink-0 group-hover:hidden">
        {tarea.frecuencia}
      </span>
      <button
        onClick={onDelete}
        className="p-1.5 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors hidden group-hover:block shrink-0"
        title="Eliminar radar"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default function ListaTareas({ userId, tareaSeleccionada, onSelectTarea, onNuevoRadar }: ListaTareasProps) {
  const [page, setPage] = useState(1);
  const limit = 8;
  const queryClient = useQueryClient();

  const { data: response, isLoading, isError } = useTareasProgramadas(userId || null, page, limit);
  const cancelarMutation = useCancelarTarea();

  const handleEliminarTarea = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (window.confirm('Estas seguro de que deseas detener y eliminar este radar?')) {
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
          toast.error(error.message || 'Error al eliminar el radar', { id: loadingToast });
        },
      });
    }
  };

  if (!userId) return null;

  const sectionHeader = (
    <div className="px-4 pt-3 pb-1.5">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        Por parte procesal
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <div>
        {sectionHeader}
        <div className="px-1 pb-2">
          <TareaSkeleton />
          <TareaSkeleton />
          <TareaSkeleton />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        {sectionHeader}
        <div className="px-4 py-6 text-center">
          <AlertCircle className="mx-auto text-destructive mb-2" size={20} />
          <p className="text-[13px] font-medium text-destructive">Error al sincronizar radares</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-1.5 text-xs text-destructive underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const tareas = response?.data || [];
  const meta = response?.meta;

  if (tareas.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <Radar size={18} className="text-muted-foreground/60" />
        </div>
        <p className="text-[13px] font-medium text-foreground mb-1">Sin radares activos</p>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-55 mx-auto">
          Crea tu primer radar para comenzar el monitoreo automatico de procesos.
        </p>
        {onNuevoRadar && (
          <button
            onClick={onNuevoRadar}
            className="mt-3 text-[13px] font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
          >
            Crear mi primer radar
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {sectionHeader}
      <div className="px-1.5 pb-2 space-y-0.5 max-h-100 overflow-y-auto custom-scrollbar">
        {tareas.map((tarea) => (
          <TareaRow
            key={tarea.id}
            tarea={tarea}
            isSelected={tareaSeleccionada === tarea.id}
            onSelect={() => onSelectTarea(tarea.id, tarea.ultimaEjecucion != null)}
            onDelete={(e) => handleEliminarTarea(e, tarea.id)}
          />
        ))}
      </div>

      {meta && meta.last_page > 1 && (
        <div className="px-3 py-2 border-t flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {meta.page} / {meta.last_page}
          </span>
          <button
            onClick={() => setPage(p => Math.min(meta.last_page, p + 1))}
            disabled={page === meta.last_page}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
