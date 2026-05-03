import { useState } from "react";
import { useResultadosExtraccion, type ProcesoJudicial } from "../hooks/useTask";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { X, ExternalLink, FileText, Search, AlertCircle } from "lucide-react";

interface TablaResultadosProps {
    userId: string | undefined;
    taskId: string | null;
}

interface ResultadosExtraccionResponse {
    data?: ProcesoJudicial[];
}

export default function TablaResultados({ userId, taskId }: TablaResultadosProps) {
    const [page, setPage] = useState(1);
    const limit = 10;
    const { data: rawData, isLoading, isError } = useResultadosExtraccion(userId, taskId, page, limit);
    const [procesoSeleccionado, setProcesoSeleccionado] = useState<ProcesoJudicial | null>(null);

    const procesos: ProcesoJudicial[] = Array.isArray(rawData)
        ? rawData
        : (rawData as unknown as ResultadosExtraccionResponse)?.data || [];

    if (!userId) {
        return (
            <Card className="border-dashed border-2 bg-slate-50/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">No hay sesión activa</p>
                    <p className="text-sm">Inicia sesión para ver resultados.</p>
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card className="border-none shadow-none bg-transparent">
                <CardContent className="flex flex-col items-center justify-center py-20 text-blue-600">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-medium">Sincronizando con SAMAI...</p>
                </CardContent>
            </Card>
        );
    }

    if (isError) {
        return (
            <Card className="border-red-100 bg-red-50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-red-600">
                    <AlertCircle size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">Error de conexión</p>
                    <p className="text-sm">No pudimos cargar los procesos en este momento.</p>
                </CardContent>
            </Card>
        );
    }

    if (!procesos || procesos.length === 0) {
        return (page === 1) ? (
            <Card className="border-dashed border-2 bg-slate-50/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <FileText size={48} className="mb-4 opacity-20" />
                    <p className="text-lg font-medium">Esperando resultados</p>
                    <p className="text-sm text-center max-w-xs">El scraper está procesando la información. Esto puede tardar unos minutos.</p>
                </CardContent>
            </Card>
        ) : (
            <Card className="border-dashed border-2 bg-slate-50/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <p className="text-lg font-medium">No hay más resultados</p>
                    <Button variant="outline" onClick={() => setPage(1)} className="mt-4">
                        Volver a la primera página
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                <CardHeader className="bg-slate-50/50 border-b border-slate-200 py-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-bold text-slate-800">Procesos Encontrados</CardTitle>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            {procesos.length} resultados
                        </Badge>
                    </div>
                </CardHeader>
                <div className="overflow-auto flex-1">
                    <Table>
                        <TableHeader className="bg-slate-50/30">
                            <TableRow>
                                <TableHead className="w-[180px]">Radicado</TableHead>
                                <TableHead>Tipo Proceso</TableHead>
                                <TableHead>Demandante</TableHead>
                                <TableHead>Descubierto</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {procesos.map((proceso: ProcesoJudicial, index: number) => (
                                <TableRow
                                    key={`${proceso.radicado}-${index}`}
                                    className="cursor-pointer group"
                                    onClick={() => setProcesoSeleccionado(proceso)}
                                >
                                    <TableCell className="font-mono font-bold text-blue-600">
                                        {proceso.radicado}
                                    </TableCell>
                                    <TableCell className="max-w-[150px] truncate">
                                        <Badge variant="outline" className="font-normal text-slate-600 border-slate-200">
                                            {proceso.tipoProceso}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-700">
                                        {proceso.demandante}
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-xs">
                                        {new Date(proceso.fechaDescubrimiento).toLocaleDateString('es-CO', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric'
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ExternalLink size={14} className="mr-2" />
                                            Detalles
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Footer */}
                <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-medium">Página {page}</p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={(e) => { e.stopPropagation(); setPage(p => Math.max(1, p - 1)); }}
                            className="h-8 px-3"
                        >
                            Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={procesos.length < limit}
                            onClick={(e) => { e.stopPropagation(); setPage(p => p + 1); }}
                            className="h-8 px-3"
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Modal */}
            {procesoSeleccionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border-none">
                        <CardHeader className="border-b border-slate-100 flex-row items-center justify-between space-y-0 p-6">
                            <div>
                                <Badge className="mb-2 bg-blue-600">Proceso Judicial</Badge>
                                <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">
                                    Radicado {procesoSeleccionado.radicado}
                                </CardTitle>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setProcesoSeleccionado(null)}
                                className="rounded-full hover:bg-slate-100"
                            >
                                <X size={20} className="text-slate-400" />
                            </Button>
                        </CardHeader>

                        <CardContent className="p-0 overflow-y-auto">
                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de Proceso</p>
                                        <p className="text-slate-700 font-medium">{procesoSeleccionado.tipoProceso}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demandante / Interesado</p>
                                        <p className="text-slate-700 font-medium">{procesoSeleccionado.demandante}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ponente / Juez</p>
                                        <p className="text-slate-700 font-medium">{procesoSeleccionado.ponente || 'No especificado'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fecha de Descubrimiento</p>
                                        <p className="text-slate-700 font-medium">
                                            {new Date(procesoSeleccionado.fechaDescubrimiento).toLocaleString('es-CO')}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                    <div className="flex items-center gap-2 mb-4 text-slate-900 font-bold">
                                        <FileText size={18} className="text-blue-600" />
                                        <h4>Resumen de la Anotación</h4>
                                    </div>
                                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                        {procesoSeleccionado.textoCompleto}
                                    </p>
                                </div>
                            </div>
                        </CardContent>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setProcesoSeleccionado(null)}>
                                Cerrar
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700" asChild>
                                <a
                                    href={`https://samai.consejodeestado.gov.co/Vistas/Casos/list_procesos.aspx?guid=${procesoSeleccionado.radicado}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center"
                                >
                                    <ExternalLink size={16} className="mr-2" />
                                    Ver en SAMAI
                                </a>
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </>
    );
}
