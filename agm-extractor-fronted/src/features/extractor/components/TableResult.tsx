import { useEffect, useState } from "react";
import { useResultadosExtraccion, type ProcesoJudicial, useDetalleProceso, useExportarUltimaActuacion, useExportarProcesos, useLimpiarProcesos, type Actuacion } from "../hooks/useTask";
import { useResultadosRadicado } from "../hooks/useRadicado";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { X, ExternalLink, FileText, Search, AlertCircle, Loader2, ChevronLeft, ChevronRight, Radar, Plus, Info, Clock, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface TablaResultadosProps {
  userId: string | undefined;
  taskId: string | null;
  radicadoTaskId?: string | null;
  taskHasRun?: boolean;
  onNuevoRadar?: () => void;
}

interface ResultadosExtraccionResponse {
  data?: ProcesoJudicial[];
}

const extraerProcesos = (rawData: unknown): ProcesoJudicial[] =>
  Array.isArray(rawData)
    ? rawData
    : (rawData as ResultadosExtraccionResponse)?.data || [];

const rtf = new Intl.RelativeTimeFormat('es-CO', { numeric: 'auto' });

function fechaRelativa(fecha: string): string {
  const diffMs = new Date(fecha).getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHoras = Math.round(diffMin / 60);
  if (Math.abs(diffHoras) < 24) return rtf.format(diffHoras, 'hour');
  const diffDias = Math.round(diffHoras / 24);
  if (Math.abs(diffDias) < 30) return rtf.format(diffDias, 'day');
  return new Date(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EstadoVacio({
  icon,
  titulo,
  descripcion,
  children,
}: {
  icon: React.ReactNode;
  titulo: string;
  descripcion: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-lg border shadow-sm flex flex-col items-center justify-center py-20 px-6 text-center animate-in">
      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">{titulo}</p>
      <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">{descripcion}</p>
      {children}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b">
        <div className="h-4 bg-muted rounded w-40 animate-pulse" />
      </div>
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-5 py-4 flex items-center gap-6 animate-pulse">
            <div className="h-3.5 bg-muted rounded w-36" />
            <div className="h-3.5 bg-muted/60 rounded w-24" />
            <div className="h-3.5 bg-muted/60 rounded flex-1 max-w-48" />
            <div className="h-3.5 bg-muted/60 rounded w-16 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CampoDetalle({ label, valor }: { label: string; valor: string | null | undefined }) {
  if (!valor) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[13px] text-foreground font-medium">{valor}</p>
    </div>
  );
}

function FilaActuacion({ act }: { act: Actuacion }) {
  const [expandida, setExpandida] = useState(false);
  return (
    <div className="py-3.5 border-b last:border-0 group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {act.fechaActuacion && (
              <span
                className="text-[11px] font-mono tabular-nums text-muted-foreground shrink-0"
                title={new Date(act.fechaActuacion).toLocaleString('es-CO')}
              >
                {new Date(act.fechaActuacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
            {act.estado && (
              <Badge variant="outline" className="text-[10px] font-normal shrink-0 h-4 px-1.5">
                {act.estado}
              </Badge>
            )}
            {act.anexos > 0 && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {act.anexos} anexo{act.anexos !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {act.actuacion && (
            <p className="text-[13px] font-medium text-foreground mb-0.5">{act.actuacion}</p>
          )}
          {act.anotacion && (
            <p
              className={`text-[12px] text-muted-foreground leading-relaxed ${!expandida ? 'line-clamp-2' : ''}`}
              onClick={() => setExpandida(e => !e)}
            >
              {act.anotacion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailModal({
  proceso,
  onClose,
}: {
  proceso: ProcesoJudicial;
  onClose: () => void;
}) {
  const [tabActiva, setTabActiva] = useState<'detalle' | 'actuaciones'>('detalle');
  const { data: detalle, isLoading } = useDetalleProceso(proceso.id);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const numActuaciones = detalle?.actuaciones?.length ?? 0;
  const mostrarDetalle = detalle?.detalleExtraido ?? proceso.detalleExtraido;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-card rounded-xl shadow-2xl overflow-hidden animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Proceso judicial
            </p>
            <h3 className="text-base font-semibold text-foreground tracking-tight font-mono">
              {proceso.radicado}
            </h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 shrink-0">
            <X size={16} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 pb-0 border-b shrink-0">
          <div className="inline-flex bg-muted rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setTabActiva('detalle')}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all cursor-pointer ${tabActiva === 'detalle'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Detalle
            </button>
            <button
              onClick={() => setTabActiva('actuaciones')}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${tabActiva === 'actuaciones'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Actuaciones
              {numActuaciones > 0 && (
                <span className="text-[11px] bg-primary/10 text-primary rounded px-1 tabular-nums">
                  {numActuaciones}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div className="overflow-y-auto custom-scrollbar flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : tabActiva === 'detalle' ? (
            <div className="px-6 py-5">
              {!mostrarDetalle && (
                <div className="flex items-start gap-3 bg-muted/50 border rounded-lg px-4 py-3 mb-5">
                  <Info size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    El detalle completo aún no ha sido extraído. Se obtendrá en la próxima ejecución del radar.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-6">
                <CampoDetalle label="Corporación" valor={detalle?.corporacion} />
                <CampoDetalle label="Tipo de proceso" valor={proceso.tipoProceso} />
                <CampoDetalle label="Demandante / Interesado" valor={proceso.demandante} />
                <CampoDetalle label="Ponente / Juez" valor={detalle?.ponente ?? proceso.ponente} />
                <CampoDetalle label="Clase" valor={detalle?.clase} />
                <CampoDetalle label="Subclase" valor={detalle?.subclase} />
                <CampoDetalle label="Naturaleza" valor={detalle?.naturaleza} />
                <CampoDetalle label="Recurso" valor={detalle?.recurso} />
                <CampoDetalle label="Origen" valor={detalle?.origen} />
                <CampoDetalle label="Etapa" valor={detalle?.etapa} />
                <CampoDetalle label="Sala conoce" valor={detalle?.salaConoce} />
                <CampoDetalle label="Sala decide" valor={detalle?.salaDecide} />
                <CampoDetalle label="Formato expediente" valor={detalle?.formatoExpediente} />
                <CampoDetalle label="Ubicación" valor={detalle?.ubicacion} />
                {detalle?.fechaRadicado && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fecha radicado</p>
                    <p className="text-[13px] text-foreground font-medium tabular-nums">
                      {new Date(detalle.fechaRadicado).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                )}
                {detalle?.fechaPresentacion && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fecha presentación</p>
                    <p className="text-[13px] text-foreground font-medium tabular-nums">
                      {new Date(detalle.fechaPresentacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                )}
                <CampoDetalle label="Sentencia" valor={detalle?.sentencia} />
                <CampoDetalle label="Marco legal" valor={detalle?.marcoLegal} />
                {detalle?.vigente != null && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estado</p>
                    <Badge
                      variant="outline"
                      className={detalle.vigente
                        ? "border-success/40 bg-success/10 text-success font-medium"
                        : "border-destructive/40 bg-destructive/10 text-destructive font-medium"
                      }
                    >
                      {detalle.vigente ? 'Vigente' : 'No vigente'}
                    </Badge>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Descubierto</p>
                  <p className="text-[13px] text-foreground font-medium tabular-nums">
                    {new Date(proceso.fechaDescubrimiento).toLocaleString('es-CO')}
                  </p>
                </div>
              </div>

              {(detalle?.asunto || proceso.textoCompleto) && (
                <div className="border rounded-lg p-5 bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={14} className="text-primary" />
                    <h4 className="text-[13px] font-semibold text-foreground">
                      {detalle?.asunto ? 'Asunto' : 'Resumen de la anotación'}
                    </h4>
                  </div>
                  <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {detalle?.asunto || proceso.textoCompleto}
                  </p>
                  {detalle?.asunto && proceso.textoCompleto && detalle.asunto !== proceso.textoCompleto && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resumen</p>
                      <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{proceso.textoCompleto}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="px-6 py-5">
              {numActuaciones === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center mb-3">
                    <Clock size={16} className="text-muted-foreground/60" />
                  </div>
                  <p className="text-[13px] font-medium text-foreground mb-1">Sin actuaciones registradas</p>
                  <p className="text-[12px] text-muted-foreground">Las actuaciones aparecerán aquí una vez extraídas.</p>
                </div>
              ) : (
                <div>
                  {detalle!.actuaciones.map((act) => (
                    <FilaActuacion key={act.id} act={act} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button asChild size="sm">
            <a
              href={`https://samai.consejodeestado.gov.co/Vistas/Casos/list_procesos.aspx?guid=${proceso.radicado}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <ExternalLink size={14} className="mr-1.5" />
              Ver en SAMAI
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TablaResultados({ userId, taskId, radicadoTaskId, taskHasRun, onNuevoRadar }: TablaResultadosProps) {
  const [page, setPage] = useState(1);
  const limit = 10;
  const isRadicadoMode = radicadoTaskId != null;
  const hasSelection = taskId != null || radicadoTaskId != null;

  const { data: procesalData, isLoading: isProcesalLoading, isError: isProcesalError } = useResultadosExtraccion(
    isRadicadoMode ? null : userId,
    taskId,
    page,
    limit
  );
  const { data: radicadoData, isLoading: isRadicadoLoading, isError: isRadicadoError } = useResultadosRadicado(
    isRadicadoMode ? userId : null,
    radicadoTaskId ?? null,
    page,
    limit
  );
  const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoJudicial | null>(null);
  const [confirmLimpiar, setConfirmLimpiar] = useState(false);
  const exportar = useExportarUltimaActuacion();
  const exportarProcesos = useExportarProcesos();
  const limpiarProcesos = useLimpiarProcesos();
  const queryClient = useQueryClient();

  const handleLimpiarTabla = () => {
    const id = isRadicadoMode ? radicadoTaskId : taskId;
    if (!id) return;
    setConfirmLimpiar(false);
    const loadingToast = toast.loading('Limpiando tabla...');
    limpiarProcesos.mutate(
      { id, modo: isRadicadoMode ? 'radicado' : 'task' },
      {
        onSuccess: (data: { deleted?: number }) => {
          queryClient.invalidateQueries({ queryKey: ['resultados'] });
          queryClient.invalidateQueries({ queryKey: ['resultadosRadicado'] });
          setPage(1);
          toast.success(`${data?.deleted ?? 0} procesos eliminados`, { id: loadingToast });
        },
        onError: (error: Error) => {
          toast.error(error.message || 'Error al limpiar la tabla', { id: loadingToast });
        },
      }
    );
  };

  const isLoading = isRadicadoMode ? isRadicadoLoading : isProcesalLoading;
  const isError = isRadicadoMode ? isRadicadoError : isProcesalError;

  const procesos: ProcesoJudicial[] = extraerProcesos(isRadicadoMode ? radicadoData : procesalData);

  if (!userId) {
    return (
      <EstadoVacio
        icon={<Search size={20} className="text-muted-foreground/60" />}
        titulo="No hay sesion activa"
        descripcion="Inicia sesion para ver los resultados de tus radares."
      />
    );
  }

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (isError) {
    return (
      <div className="bg-card rounded-lg border border-destructive/20 shadow-sm flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center mb-4">
          <AlertCircle size={20} className="text-destructive" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">Error de conexion</p>
        <p className="text-[13px] text-muted-foreground max-w-xs">No pudimos cargar los procesos en este momento.</p>
      </div>
    );
  }

  if (!procesos || procesos.length === 0) {
    if (page > 1) {
      return (
        <EstadoVacio
          icon={<FileText size={20} className="text-muted-foreground/60" />}
          titulo="No hay mas resultados"
          descripcion="Has llegado al final de la lista."
        >
          <Button variant="outline" size="sm" onClick={() => setPage(1)} className="mt-4">
            Volver a la primera pagina
          </Button>
        </EstadoVacio>
      );
    }

    if (!hasSelection) {
      return (
        <EstadoVacio
          icon={<Radar size={20} className="text-muted-foreground/60" />}
          titulo="Tus resultados apareceran aqui"
          descripcion="Selecciona un radar de la lista para ver sus procesos, o crea uno nuevo para comenzar el monitoreo."
        >
          {onNuevoRadar && (
            <Button size="sm" onClick={onNuevoRadar} className="mt-4 gap-1.5 cursor-pointer">
              <Plus size={14} />
              Nuevo Radar
            </Button>
          )}
        </EstadoVacio>
      );
    }

    if (!taskHasRun) {
      return (
        <EstadoVacio
          icon={<Loader2 size={20} className="text-primary animate-spin" />}
          titulo="Procesando primera busqueda..."
          descripcion="El scraper esta consultando la informacion. Esto puede tardar unos momentos."
        />
      );
    }

    return (
      <EstadoVacio
        icon={<FileText size={20} className="text-muted-foreground/60" />}
        titulo="No se encontraron resultados"
        descripcion="No hay procesos asociados a este radar. Se seguira revisando segun la frecuencia configurada."
      />
    );
  }

  return (
    <>
      <div className="bg-card rounded-lg border shadow-sm overflow-hidden flex flex-col animate-in">
        <div className="px-5 py-3.5 border-b flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-foreground tracking-tight">Resultados</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasSelection ? 'Procesos del radar seleccionado' : 'Todos los radares'}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportarProcesos.mutate(undefined, {
                onSuccess: () => toast.success('Archivo de procesos descargado'),
                onError: (error: Error) => toast.error(error.message || 'Error al exportar el archivo'),
              })}
              disabled={exportarProcesos.isPending}
              className="h-8 gap-1.5 text-[13px] cursor-pointer"
              title="Descargar Excel con todos tus procesos registrados"
            >
              {exportarProcesos.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Exportar Procesos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportar.mutate(undefined, {
                onSuccess: () => toast.success('Archivo de última actuación descargado'),
                onError: (error: Error) => toast.error(error.message || 'Error al exportar el archivo'),
              })}
              disabled={exportar.isPending}
              className="h-8 gap-1.5 text-[13px] cursor-pointer"
              title="Descargar Excel con la última actuación de todos tus procesos"
            >
              {exportar.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Exportar Última Actuación
            </Button>
            {hasSelection && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmLimpiar(true)}
                disabled={limpiarProcesos.isPending}
                className="h-8 gap-1.5 text-[13px] text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                title="Eliminar todos los procesos de este radar"
              >
                {limpiarProcesos.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Limpiar tabla
              </Button>
            )}
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15 tabular-nums">
              {procesos.length} resultados
            </Badge>
          </div>
        </div>

        <div className="overflow-auto flex-1 custom-scrollbar">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-50 text-[11px] font-semibold  tracking-wider text-muted-foreground bg-muted/50">Radicado</TableHead>
                <TableHead className="text-[11px] font-semibold  tracking-wider text-muted-foreground bg-muted/50">Tipo proceso</TableHead>
                <TableHead className="text-[11px] font-semibold  tracking-wider text-muted-foreground bg-muted/50">Demandante</TableHead>
                <TableHead className="text-[11px] font-semibold  tracking-wider text-muted-foreground bg-muted/50">Última actuación</TableHead>
                <TableHead className="text-[11px] font-semibold  tracking-wider text-muted-foreground bg-muted/50">Descubierto</TableHead>
                <TableHead className="text-right text-[11px] font-semibold tracking-wider text-muted-foreground bg-muted/50">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {procesos.map((proceso: ProcesoJudicial, index: number) => (
                <TableRow
                  key={`${proceso.radicado}-${index}`}
                  className="cursor-pointer group hover:bg-muted/50"
                  onClick={() => setProcesoSeleccionado(proceso)}
                >
                  <TableCell className="font-mono text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">
                    <span className="flex items-center gap-1.5">
                      {proceso.radicado}
                      {proceso.detalleExtraido && (
                        <span title="Detalle disponible" className="shrink-0">
                          <FileText size={11} className="text-primary/60" />
                        </span>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-37.5 truncate">
                    <Badge variant="outline" className="font-normal text-muted-foreground text-xs lowercase">
                      {proceso.tipoProceso}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[13px] font-medium text-foreground lowercase">
                    {proceso.demandante}
                  </TableCell>
                  <TableCell className="max-w-50 text-[13px] text-foreground">
                    {proceso.ultimaActuacion ? (
                      <span className="flex flex-col gap-0.5">
                        {proceso.ultimaActuacionFecha && (
                          <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                            {new Date(proceso.ultimaActuacionFecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                        <span className="line-clamp-2 leading-snug">{proceso.ultimaActuacion.toLowerCase()}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground text-xs whitespace-nowrap"
                    title={new Date(proceso.fechaDescubrimiento).toLocaleString('es-CO')}
                  >
                    {fechaRelativa(proceso.fechaDescubrimiento)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground group-hover:text-foreground cursor-pointer"
                    >
                      Detalles
                      <ChevronRight size={13} className="ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="px-4 py-2.5 border-t flex items-center justify-between">
          <p className="text-xs text-muted-foreground tabular-nums">Pagina {page}</p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <ChevronLeft size={13} />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={procesos.length < limit}
              onClick={() => setPage(p => p + 1)}
              className="h-7 px-2.5 text-xs gap-1"
            >
              Siguiente
              <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      </div>

      {procesoSeleccionado && (
        <DetailModal
          proceso={procesoSeleccionado}
          onClose={() => setProcesoSeleccionado(null)}
        />
      )}

      <ConfirmDialog
        open={confirmLimpiar}
        destructive
        title="Limpiar tabla"
        description="Se eliminaran de forma permanente todos los procesos y actuaciones de este radar. El radar seguira activo y volvera a poblar la tabla en su proxima ejecucion."
        confirmText="Limpiar"
        onConfirm={handleLimpiarTabla}
        onCancel={() => setConfirmLimpiar(false)}
      />
    </>
  );
}
