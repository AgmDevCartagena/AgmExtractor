import { signOut, useSession } from '@/lib/auth-client';
import FormularioExtraccion from '../components/FormExtract';
import TablaResultados from '../components/TableResult';
import ListaTareas from '../components/ListTask';
import ListaTareasRadicado from '../components/ListaTareasRadicado';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Scale, Plus, X } from 'lucide-react';

type ActiveMode = 'task' | 'radicado';

export default function Dashboard() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedRadicadoTaskId, setSelectedRadicadoTaskId] = useState<string | null>(null);
  const [selectedTaskHasRun, setSelectedTaskHasRun] = useState(false);
  const [activeMode, setActiveMode] = useState<ActiveMode>('task');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleSelectTask = (id: string | null, hasRun?: boolean) => {
    setSelectedTaskId(id);
    setSelectedRadicadoTaskId(null);
    setSelectedTaskHasRun(hasRun ?? false);
    setActiveMode('task');
  };

  const handleSelectRadicadoTask = (id: string | null, hasRun?: boolean) => {
    setSelectedRadicadoTaskId(id);
    setSelectedTaskId(null);
    setSelectedTaskHasRun(hasRun ?? false);
    setActiveMode('radicado');
  };

  const handleCerrarSesion = async () => {
    await signOut();
    window.location.reload();
  };

  const abrirModal = () => setIsModalOpen(true);

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-400 mx-auto px-6 h-14 flex justify-between items-center w-full">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary rounded-md">
              <Scale size={15} className="text-primary-foreground" />
            </div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">RADAR</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:block text-right">
                <p className="text-[13px] font-medium text-foreground leading-tight">{session?.user?.name || 'Usuario'}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{session?.user?.email}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold border border-primary/20">
                {session?.user?.name?.[0] || 'U'}
              </div>
            </div>

            <div className="w-px h-5 bg-border hidden sm:block" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCerrarSesion}
              className="gap-2 h-8 text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive/5"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Cerrar sesion</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8 max-w-400 mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-20 mb-6 lg:mb-0">
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground tracking-tight">Radares</h2>
                <Button onClick={abrirModal} size="sm" className="h-8 gap-1.5 text-[13px] font-medium">
                  <Plus size={14} />
                  Nuevo
                </Button>
              </div>

              <ListaTareas
                userId={userId || undefined}
                tareaSeleccionada={activeMode === 'task' ? selectedTaskId : null}
                onSelectTarea={handleSelectTask}
                onNuevoRadar={abrirModal}
              />

              <ListaTareasRadicado
                userId={userId || undefined}
                tareaSeleccionada={activeMode === 'radicado' ? selectedRadicadoTaskId : null}
                onSelectTarea={handleSelectRadicadoTask}
              />
            </div>
          </div>

          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
            {currentJobId && (
              <div className="bg-primary/5 border border-primary/20 text-primary px-4 py-2.5 rounded-lg flex items-center gap-3 animate-in">
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                <p className="text-[13px] font-medium">
                  Extraccion en curso
                  <span className="text-primary/60 font-mono text-xs ml-2">ID: {currentJobId}</span>
                </p>
              </div>
            )}

            <div className="min-h-150">
              <TablaResultados
                userId={userId || undefined}
                taskId={activeMode === 'task' ? selectedTaskId : null}
                radicadoTaskId={activeMode === 'radicado' ? selectedRadicadoTaskId : null}
                taskHasRun={selectedTaskHasRun}
                onNuevoRadar={abrirModal}
              />
            </div>
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-card rounded-xl shadow-2xl overflow-hidden animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-foreground tracking-tight">Nuevo Radar</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Configura los parametros de la busqueda automatica.</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full h-8 w-8 shrink-0"
              >
                <X size={16} />
              </Button>
            </div>
            <FormularioExtraccion onJobCreated={(id) => {
              if (id) setCurrentJobId(id);
              setIsModalOpen(false);
            }} />
          </div>
        </div>
      )}
    </div>
  );
}
