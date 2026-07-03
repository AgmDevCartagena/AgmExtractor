import { useState } from 'react';
import { useProgramarTarea, useEditarTarea, type FrecuenciaPermitida, type ScheduledTask } from '../hooks/useTask';
import { useProgramarRadicado } from '../hooks/useRadicado';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, ChevronDown, FileSearch, Landmark, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type ModoBusqueda = 'procesal' | 'radicado';

interface FormularioProps {
  onJobCreated?: (jobId: string) => void;
  initialTask?: ScheduledTask;
  onJobUpdated?: () => void;
}

export const CORPORACIONES = [
  { value: "1100103", label: "Consejo de Estado" },
  { value: "2001133", label: "Juzgado Administrativo de Aguachica" },
  { value: "0504533", label: "Juzgado Administrativo de Apartado" },
  { value: "8100133", label: "Juzgado Administrativo de Arauca" },
  { value: "6300133", label: "Juzgado Administrativo de Armenia" },
  { value: "6808133", label: "Juzgado Administrativo de Barrancabermeja" },
  { value: "0800133", label: "Juzgado Administrativo de Barranquilla" },
  { value: "1100133", label: "Juzgado Administrativo de Bogota" },
  { value: "6800133", label: "Juzgado Administrativo de Bucaramanga" },
  { value: "7610933", label: "Juzgado Administrativo de Buenaventura" },
  { value: "7611133", label: "Juzgado Administrativo de Buga" },
  { value: "7600133", label: "Juzgado Administrativo de Cali" },
  { value: "1300133", label: "Juzgado Administrativo de Cartagena" },
  { value: "7614733", label: "Juzgado Administrativo de Cartago" },
  { value: "5400133", label: "Juzgado Administrativo de Cucuta" },
  { value: "1523833", label: "Juzgado Administrativo de Duitama" },
  { value: "2526933", label: "Juzgado Administrativo de Facatativa" },
  { value: "1800133", label: "Juzgado Administrativo de Florencia" },
  { value: "2530733", label: "Juzgado Administrativo de Girardot" },
  { value: "5031333", label: "Juzgado Administrativo de Granada" },
  { value: "7300133", label: "Juzgado Administrativo de Ibague" },
  { value: "9100133", label: "Juzgado Administrativo de Leticia" },
  { value: "1343033", label: "Juzgado Administrativo de Magangue" },
  { value: "4443033", label: "Juzgado Administrativo de Maicao" },
  { value: "1700133", label: "Juzgado Administrativo de Manizales" },
  { value: "0500133", label: "Juzgado Administrativo de Medellin" },
  { value: "8600133", label: "Juzgado Administrativo de Mocoa" },
  { value: "2300133", label: "Juzgado Administrativo de Monteria" },
  { value: "4100133", label: "Juzgado Administrativo de Neiva" },
  { value: "5449833", label: "Juzgado Administrativo de Ocana" },
  { value: "5451833", label: "Juzgado Administrativo de Pamplona" },
  { value: "5200123", label: "Tribunal Administrativo de Narino" },
  { value: "5200133", label: "Juzgado Administrativo de Pasto" },
  { value: "6600133", label: "Juzgado Administrativo de Pereira" },
  { value: "1900133", label: "Juzgado Administrativo de Popayan" },
  { value: "2700133", label: "Juzgado Administrativo de Quibdo" },
  { value: "4400133", label: "Juzgado Administrativo de Riohacha" },
  { value: "8800133", label: "Juzgado Administrativo de San Andres" },
  { value: "6867933", label: "Juzgado Administrativo de San Gil" },
  { value: "9500133", label: "Juzgado Administrativo de San Jose del Guaviare" },
  { value: "4700133", label: "Juzgado Administrativo de Santa Marta" },
  { value: "7000133", label: "Juzgado Administrativo de Sincelejo" },
  { value: "1575933", label: "Juzgado Administrativo de Sogamoso" },
  { value: "5283533", label: "Juzgado Administrativo de Tumaco" },
  { value: "1500133", label: "Juzgado Administrativo de Tunja" },
  { value: "0583733", label: "Juzgado Administrativo de Turbo" },
  { value: "2000133", label: "Juzgado Administrativo de Valledupar" },
  { value: "5000133", label: "Juzgado Administrativo de Villavicencio" },
  { value: "8500133", label: "Juzgado Administrativo de Yopal" },
  { value: "2589933", label: "Juzgado Administrativo de Zipaquira" },
  { value: "0500123", label: "Tribunal Administrativo de Antioquia" },
  { value: "8100123", label: "Tribunal Administrativo de Arauca" },
  { value: "0800123", label: "Tribunal Administrativo del Atlantico" },
  { value: "1300123", label: "Tribunal Administrativo de Bolivar" },
  { value: "1500123", label: "Tribunal Administrativo de Boyaca" },
  { value: "1700123", label: "Tribunal Administrativo de Caldas" },
  { value: "1800123", label: "Tribunal Administrativo del Caqueta" },
  { value: "8500123", label: "Tribunal Administrativo del Casanare" },
  { value: "1900123", label: "Tribunal Administrativo del Cauca" },
  { value: "2000123", label: "Tribunal Administrativo del Cesar" },
  { value: "2700123", label: "Tribunal Administrativo del Choco" },
  { value: "2300123", label: "Tribunal Administrativo de Cordoba" },
  { value: "2500023", label: "Tribunal Administrativo de Cundinamarca" },
  { value: "4100123", label: "Tribunal Administrativo del Huila" },
  { value: "4400123", label: "Tribunal Administrativo de la Guajira" },
  { value: "4700123", label: "Tribunal Administrativo del Magdalena" },
  { value: "5000123", label: "Tribunal Administrativo del Meta" },
  { value: "5400123", label: "Tribunal Administrativo de Norte de Santander" },
  { value: "8600123", label: "Tribunal Administrativo del Putumayo" },
  { value: "6300123", label: "Tribunal Administrativo del Quindio" },
  { value: "6600123", label: "Tribunal Administrativo de Risaralda" },
  { value: "8800123", label: "Tribunal Administrativo de San Andres" },
  { value: "6800123", label: "Tribunal Administrativo de Santander" },
  { value: "7000123", label: "Tribunal Administrativo de Sucre" },
  { value: "7300123", label: "Tribunal Administrativo del Tolima" },
  { value: "7600123", label: "Tribunal Administrativo del Valle del Cauca" },
];

export default function FormularioExtraccion({ onJobCreated, initialTask, onJobUpdated }: FormularioProps) {
  const isEdit = !!initialTask;
  const [modo, setModo] = useState<ModoBusqueda>('procesal');
  const [parteProcesalInput, setParteProcesalInput] = useState('');
  const [partesProcesales, setPartesProcesales] = useState<string[]>(
    initialTask ? (Array.isArray(initialTask.parteProcesal) ? initialTask.parteProcesal : [initialTask.parteProcesal]) : []
  );
  const [radicado, setRadicado] = useState('');
  const [juzgado, setJuzgado] = useState(
    initialTask ? (CORPORACIONES.find(c => c.label === initialTask.juzgado)?.value ?? '') : ''
  );
  const [frecuencia, setFrecuencia] = useState<FrecuenciaPermitida>(initialTask?.frecuencia ?? '1d');

  const programarMutation = useProgramarTarea();
  const editarMutation = useEditarTarea();
  const programarRadicadoMutation = useProgramarRadicado();
  const queryClient = useQueryClient();

  const isPending = isEdit
    ? editarMutation.isPending
    : modo === 'procesal' ? programarMutation.isPending : programarRadicadoMutation.isPending;

  const cambiarModo = (nuevoModo: ModoBusqueda) => {
    setModo(nuevoModo);
    if (nuevoModo === 'procesal') {
      setRadicado('');
    } else {
      setPartesProcesales([]);
      setParteProcesalInput('');
    }
  };

  const resetForm = () => {
    setPartesProcesales([]);
    setParteProcesalInput('');
    setRadicado('');
    setJuzgado('');
    setFrecuencia('1d');
  };

  const agregarParte = (valor: string) => {
    const v = valor.trim();
    if (v && !partesProcesales.includes(v)) {
      setPartesProcesales([...partesProcesales, v]);
    }
    setParteProcesalInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const corporacionSeleccionada = CORPORACIONES.find(c => c.value === juzgado);
    const juzgadoNombre = corporacionSeleccionada ? corporacionSeleccionada.label : juzgado;

    if (isEdit && initialTask) {
      const partesEdit = [...partesProcesales];
      if (parteProcesalInput.trim() && !partesEdit.includes(parteProcesalInput.trim())) {
        partesEdit.push(parteProcesalInput.trim());
      }
      if (partesEdit.length === 0) {
        toast.error('Ingresa al menos una parte procesal.');
        return;
      }
      if (!juzgado) {
        toast.error('Selecciona una corporacion / juzgado.');
        return;
      }

      editarMutation.mutate(
        { id: initialTask.id, parteProcesal: partesEdit, juzgado: juzgadoNombre, frecuencia },
        {
          onSuccess: () => {
            toast.success('Radar actualizado exitosamente');
            queryClient.invalidateQueries({ queryKey: ['tareasProgramadas'] });
            queryClient.invalidateQueries({ queryKey: ['resultados'] });
            onJobUpdated?.();
          },
          onError: (error) => {
            toast.error(error.message || 'Error al actualizar el radar');
          },
        }
      );
      return;
    }

    if (modo === 'radicado') {
      const radicadoLimpio = radicado.trim();
      if (!radicadoLimpio) {
        toast.error('Ingresa un numero de radicado valido.');
        return;
      }
      if (!juzgado) {
        toast.error('Selecciona una corporacion / juzgado.');
        return;
      }

      programarRadicadoMutation.mutate(
        { radicado: radicadoLimpio, juzgado: juzgadoNombre, frecuencia },
        {
          onSuccess: (data: any) => {
            toast.success('Radar de radicado programado exitosamente');
            onJobCreated?.(data?.id || '');
            resetForm();
          },
          onError: (error) => {
            toast.error(error.message || 'Error al programar el radar');
          },
        }
      );
      return;
    }

    let currentPartes = [...partesProcesales];
    if (parteProcesalInput.trim()) {
      if (!currentPartes.includes(parteProcesalInput.trim())) {
        currentPartes.push(parteProcesalInput.trim());
      }
    }

    if (currentPartes.length === 0) {
      toast.error('Ingresa al menos una parte procesal.');
      return;
    }

    programarMutation.mutate(
      { parteProcesal: currentPartes as any, juzgado: juzgadoNombre, frecuencia },
      {
        onSuccess: (data) => {
          toast.success('Radar programado exitosamente');
          queryClient.invalidateQueries({ queryKey: ['tareasProgramadas'] });
          onJobCreated?.(data?.id || '');
          resetForm();
        },
        onError: (error) => {
          toast.error(error.message || 'Error al programar el radar');
        },
      }
    );
  };

  return (
    <div className="p-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          {!isEdit && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => cambiarModo('procesal')}
              className={`flex items-center justify-center gap-2 h-8 rounded-md text-[13px] font-medium transition-all ${
                modo === 'procesal'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User size={14} />
              Parte Procesal
            </button>
            <button
              type="button"
              onClick={() => cambiarModo('radicado')}
              className={`flex items-center justify-center gap-2 h-8 rounded-md text-[13px] font-medium transition-all ${
                modo === 'radicado'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileSearch size={14} />
              Radicado
            </button>
          </div>
          )}

          <div className="space-y-4">
            {modo === 'procesal' ? (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[13px]">
                  <User size={14} className="text-muted-foreground" />
                  Partes Procesales
                </Label>
                <div className="bg-background border border-input rounded-md focus-within:ring-2 focus-within:ring-ring/30 focus-within:border-ring transition-all p-1.5 flex flex-wrap gap-1.5 items-center min-h-[40px]">
                  {partesProcesales.map((parte, idx) => (
                    <span key={idx} className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded-sm flex items-center gap-1.5">
                      {parte}
                      <button
                        type="button"
                        onClick={() => setPartesProcesales(partesProcesales.filter(p => p !== parte))}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={parteProcesalInput}
                    onChange={(e) => setParteProcesalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        agregarParte(parteProcesalInput);
                      }
                    }}
                    placeholder={partesProcesales.length === 0 ? 'Ej. Banco de Bogota...' : 'Agregar otro...'}
                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm min-w-[140px] px-1.5 py-1 placeholder:text-muted-foreground"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Presiona Enter o coma (,) para agregar a la lista.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[13px]">
                  <FileSearch size={14} className="text-muted-foreground" />
                  Numero de Radicado
                </Label>
                <Input
                  type="text"
                  value={radicado}
                  onChange={(e) => setRadicado(e.target.value)}
                  placeholder="Ej. 11001334300220200009800"
                />
                <p className="text-xs text-muted-foreground">Ingresa el radicado completo para monitorear sus actualizaciones.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[13px]">
                <Landmark size={14} className="text-muted-foreground" />
                Corporacion / Juzgado
              </Label>
              <div className="relative">
                <select
                  required
                  value={juzgado}
                  onChange={(e) => setJuzgado(e.target.value)}
                  className="w-full h-9 px-3 pr-8 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring appearance-none text-[13px] transition-all"
                >
                  <option value="">-- Seleccione Corporacion --</option>
                  {CORPORACIONES.map((corp) => (
                    <option key={corp.value} value={corp.value}>
                      {corp.label}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none">
                  <ChevronDown size={14} className="text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[13px]">
                <Calendar size={14} className="text-muted-foreground" />
                Frecuencia
              </Label>
              <div className="relative">
                <select
                  value={frecuencia}
                  onChange={(e) => setFrecuencia(e.target.value as FrecuenciaPermitida)}
                  className="w-full h-9 px-3 pr-8 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring appearance-none text-[13px] transition-all"
                >
                  <option value="3min">Cada 3 Minutos</option>
                  <option value="15min">Cada 15 Minutos</option>
                  <option value="30min">Cada 30 Minutos</option>
                  <option value="1h">Cada 1 Hora</option>
                  <option value="12h">Cada 12 Horas</option>
                  <option value="1d">Cada 1 Dia</option>
                  <option value="2d">Cada 2 Dias</option>
                  <option value="3d">Cada 3 Dias</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none">
                  <ChevronDown size={14} className="text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-10"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                {isEdit ? 'Guardando...' : 'Programando...'}
              </span>
            ) : (
              isEdit ? 'Guardar cambios' : 'Programar Busqueda'
            )}
          </Button>
        </form>
    </div>
  );
}
