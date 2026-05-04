import { useState } from 'react';
import { useProgramarTarea, type FrecuenciaPermitida } from '../hooks/useTask';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Landmark, Send, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface FormularioProps {
    onJobCreated: (jobId: string) => void;
}

const CORPORACIONES = [
    { value: "1100103", label: "Consejo de Estado" },
    { value: "2001133", label: "Juzgado Administrativo de Aguachica" },
    { value: "0504533", label: "Juzgado Administrativo de Apartadó" },
    { value: "8100133", label: "Juzgado Administrativo de Arauca" },
    { value: "6300133", label: "Juzgado Administrativo de Armenia" },
    { value: "6808133", label: "Juzgado Administrativo de Barrancabermeja" },
    { value: "0800133", label: "Juzgado Administrativo de Barranquilla" },
    { value: "1100133", label: "Juzgado Administrativo de Bogotá" },
    { value: "6800133", label: "Juzgado Administrativo de Bucaramanga" },
    { value: "7610933", label: "Juzgado Administrativo de Buenaventura" },
    { value: "7611133", label: "Juzgado Administrativo de Buga" },
    { value: "7600133", label: "Juzgado Administrativo de Cali" },
    { value: "1300133", label: "Juzgado Administrativo de Cartagena" },
    { value: "7614733", label: "Juzgado Administrativo de Cartago" },
    { value: "5400133", label: "Juzgado Administrativo de Cúcuta" },
    { value: "1523833", label: "Juzgado Administrativo de Duitama" },
    { value: "2526933", label: "Juzgado Administrativo de Facatativá" },
    { value: "1800133", label: "Juzgado Administrativo de Florencia" },
    { value: "2530733", label: "Juzgado Administrativo de Girardot" },
    { value: "5031333", label: "Juzgado Administrativo de Granada" },
    { value: "7300133", label: "Juzgado Administrativo de Ibagué" },
    { value: "9100133", label: "Juzgado Administrativo de Leticia" },
    { value: "1343033", label: "Juzgado Administrativo de Magangué" },
    { value: "4443033", label: "Juzgado Administrativo de Maicao" },
    { value: "1700133", label: "Juzgado Administrativo de Manizales" },
    { value: "0500133", label: "Juzgado Administrativo de Medellín" },
    { value: "8600133", label: "Juzgado Administrativo de Mocoa" },
    { value: "2300133", label: "Juzgado Administrativo de Montería" },
    { value: "4100133", label: "Juzgado Administrativo de Neiva" },
    { value: "5449833", label: "Juzgado Administrativo de Ocaña" },
    { value: "5451833", label: "Juzgado Administrativo de Pamplona" },
    { value: "5200123", label: "Tribunal Administrativo de Nariño" },
    { value: "5200133", label: "Juzgado Administrativo de Pasto" },
    { value: "6600133", label: "Juzgado Administrativo de Pereira" },
    { value: "1900133", label: "Juzgado Administrativo de Popayán" },
    { value: "2700133", label: "Juzgado Administrativo de Quibdó" },
    { value: "4400133", label: "Juzgado Administrativo de Riohacha" },
    { value: "8800133", label: "Juzgado Administrativo de San Andrés" },
    { value: "6867933", label: "Juzgado Administrativo de San Gil" },
    { value: "9500133", label: "Juzgado Administrativo de San José del Guaviare" },
    { value: "4700133", label: "Juzgado Administrativo de Santa Marta" },
    { value: "7000133", label: "Juzgado Administrativo de Sincelejo" },
    { value: "1575933", label: "Juzgado Administrativo de Sogamoso" },
    { value: "5283533", label: "Juzgado Administrativo de Tumaco" },
    { value: "1500133", label: "Juzgado Administrativo de Tunja" },
    { value: "0583733", label: "Juzgado Administrativo de Turbo" },
    { value: "2000133", label: "Juzgado Administrativo de Valledupar" },
    { value: "5000133", label: "Juzgado Administrativo de Villavicencio" },
    { value: "8500133", label: "Juzgado Administrativo de Yopal" },
    { value: "2589933", label: "Juzgado Administrativo de Zipaquirá" },
    { value: "0500123", label: "Tribunal Administrativo de Antioquia" },
    { value: "8100123", label: "Tribunal Administrativo de Arauca" },
    { value: "0800123", label: "Tribunal Administrativo del Atlántico" },
    { value: "1300123", label: "Tribunal Administrativo de Bolívar" },
    { value: "1500123", label: "Tribunal Administrativo de Boyacá" },
    { value: "1700123", label: "Tribunal Administrativo de Caldas" },
    { value: "1800123", label: "Tribunal Administrativo del Caquetá" },
    { value: "8500123", label: "Tribunal Administrativo del Casanare" },
    { value: "1900123", label: "Tribunal Administrativo del Cauca" },
    { value: "2000123", label: "Tribunal Administrativo del Cesar" },
    { value: "2700123", label: "Tribunal Administrativo del Chocó" },
    { value: "2300123", label: "Tribunal Administrativo de Córdoba" },
    { value: "2500023", label: "Tribunal Administrativo de Cundinamarca" },
    { value: "4100123", label: "Tribunal Administrativo del Huila" },
    { value: "4400123", label: "Tribunal Administrativo de la Guajira" },
    { value: "4700123", label: "Tribunal Administrativo del Magdalena" },
    { value: "5000123", label: "Tribunal Administrativo del Meta" },
    { value: "5400123", label: "Tribunal Administrativo de Norte de Santander" },
    { value: "8600123", label: "Tribunal Administrativo del Putumayo" },
    { value: "6300123", label: "Tribunal Administrativo del Quindío" },
    { value: "6600123", label: "Tribunal Administrativo de Risaralda" },
    { value: "8800123", label: "Tribunal Administrativo de San Andrés" },
    { value: "6800123", label: "Tribunal Administrativo de Santander" },
    { value: "7000123", label: "Tribunal Administrativo de Sucre" },
    { value: "7300123", label: "Tribunal Administrativo del Tolima" },
    { value: "7600123", label: "Tribunal Administrativo del Valle del Cauca" }
];

export default function FormularioExtraccion({ onJobCreated }: FormularioProps) {
    const [parteProcesalInput, setParteProcesalInput] = useState('');
    const [partesProcesales, setPartesProcesales] = useState<string[]>([]);
    const [juzgado, setJuzgado] = useState('');
    const [frecuencia, setFrecuencia] = useState<FrecuenciaPermitida>('1d');

    const programarMutation = useProgramarTarea();
    const queryClient = useQueryClient();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const corporacionSeleccionada = CORPORACIONES.find(c => c.value === juzgado);
        const juzgadoNombre = corporacionSeleccionada ? corporacionSeleccionada.label : juzgado;

        let currentPartes = [...partesProcesales];
        
        // Agregar el texto actual como parte procesal si no ha presionado Enter
        if (parteProcesalInput.trim()) {
            if (!currentPartes.includes(parteProcesalInput.trim())) {
                currentPartes.push(parteProcesalInput.trim());
            }
        }

        if (currentPartes.length === 0) {
            toast.error('Por favor ingresa al menos una parte procesal válida.');
            return;
        }

        programarMutation.mutate(
            
            { parteProcesal: currentPartes as any, juzgado: juzgadoNombre, frecuencia },
            {
                onSuccess: (data) => {
                    toast.success('Radar programado exitosamente');
                    queryClient.invalidateQueries({ queryKey: ['tareasProgramadas'] });

                    onJobCreated(data?.id || '');

                    setPartesProcesales([]);
                    setParteProcesalInput('');
                    setJuzgado('');
                    setFrecuencia('1d');
                },
                onError: (error) => {
                    toast.error(error.message || 'Error al programar el radar');
                }
            }
        );
    };

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="h-2 bg-blue-600 w-full"></div>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Send size={18} className="text-blue-600" />
                    Nueva Extracción
                </CardTitle>
                <CardDescription>
                    Configura los parámetros para la búsqueda automática.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <User size={14} className="text-slate-400" />
                                Partes Procesales
                            </label>
                            <div className="bg-slate-50 border border-slate-200 rounded-md focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-500 transition-all p-1.5 flex flex-wrap gap-1.5 items-center min-h-[42px]">
                                {partesProcesales.map((parte, idx) => (
                                    <span key={idx} className="bg-blue-100 text-blue-700 text-[12px] font-semibold px-2 py-1 rounded-sm flex items-center gap-1.5 shadow-sm">
                                        {parte}
                                        <button 
                                            type="button" 
                                            onClick={() => setPartesProcesales(partesProcesales.filter(p => p !== parte))} 
                                            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                                        >
                                            <X size={12} className="text-blue-600" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={parteProcesalInput}
                                    onChange={(e) => setParteProcesalInput(e.target.value)}
                                    // Manejar la tecla enter o coma para agregar un nombre nuevo
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ',') {
                                            e.preventDefault();
                                            const val = parteProcesalInput.trim();
                                            if (val && !partesProcesales.includes(val)) {
                                                setPartesProcesales([...partesProcesales, val]);
                                            }
                                            setParteProcesalInput('');
                                        }
                                    }}
                                    placeholder={partesProcesales.length === 0 ? "Ej. Banco de Bogotá..." : "Agregar otro..."}
                                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm min-w-[140px] px-1.5 py-1"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400">Presiona 'Enter' o la coma ( , ) para ir agregando a la lista y presiona el botón 'Programar Búsqueda' para guardar.</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Landmark size={14} className="text-slate-400" />
                                Corporación / Juzgado
                            </label>
                            <div className="relative">
                                <select
                                    required
                                    value={juzgado}
                                    onChange={(e) => setJuzgado(e.target.value)}
                                    className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white appearance-none text-sm transition-all"
                                >
                                    <option value="">-- Seleccione Corporación --</option>
                                    {CORPORACIONES.map((corp) => (
                                        <option key={corp.value} value={corp.value}>
                                            {corp.label}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Calendar size={14} className="text-slate-400" />
                                Frecuencia
                            </label>
                            <div className="relative">
                                <select
                                    value={frecuencia}
                                    onChange={(e) => setFrecuencia(e.target.value as FrecuenciaPermitida)}
                                    className="w-full h-10 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white appearance-none text-sm transition-all"
                                >
                                    <option value="3min">Cada 3 Minutos</option>
                                    <option value="15min">Cada 15 Minutos</option>
                                    <option value="30min">Cada 30 Minutos</option>
                                    <option value="1h">Cada 1 Hora</option>
                                    <option value="12h">Cada 12 Horas</option>
                                    <option value="1d">Cada 1 Día</option>
                                    <option value="2d">Cada 2 Días</option>
                                    <option value="3d">Cada 3 Días</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={programarMutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700 h-11 transition-all"
                    >
                        {programarMutation.isPending ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Programando...</span>
                            </div>
                        ) : (
                            'Programar Búsqueda'
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}