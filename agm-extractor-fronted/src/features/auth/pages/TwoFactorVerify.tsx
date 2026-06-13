import { useCallback, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { twoFactor } from '../../../lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, KeyRound, Radar, ShieldCheck } from 'lucide-react';

export default function TwoFactorVerify() {
    const [code, setCode] = useState('');
    const [useBackup, setUseBackup] = useState(false);
    const [trustDevice, setTrustDevice] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const particlesInit = useCallback(async (engine: any) => {
        await loadSlim(engine);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const { data, error: authError } = useBackup
                ? await twoFactor.verifyBackupCode({ code: code.trim() })
                : await twoFactor.verifyTotp({ code: code.trim(), trustDevice });

            if (authError) {
                setError(authError.message || 'Código incorrecto. Inténtalo de nuevo.');
                return;
            }

            if (data) {
                navigate('/');
            }
        } catch (err) {
            setError('Error de conexión con el servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
            {/* Visual Side */}
            <div className="hidden md:flex md:w-1/2 bg-slate-900 items-center justify-center p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-500 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-500 rounded-full blur-[120px]"></div>
                </div>

                <div className="relative z-10 max-w-lg">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-teal-600 rounded-xl shadow-lg shadow-teal-500/20">
                            <Radar size={32} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter">RADAR</h1>
                    </div>
                    <h2 className="text-5xl font-bold mb-6 leading-tight">
                        Un paso más para <span className="text-teal-400">proteger</span> tu cuenta.
                    </h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Ingresa el código de tu aplicación de autenticación para confirmar tu identidad.
                    </p>
                </div>

                <div className="absolute bottom-12 left-12 right-12 text-slate-500 text-sm flex justify-between border-t border-slate-800 pt-8">
                    <span>© 2026 AGM RADAR</span>
                    <span>Versión 1.0.0</span>
                </div>
            </div>

            {/* Form Side */}
            <div className="lg:w-1/2 max-lg:w-full flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-background">
                <Particles
                    id="tsparticles"
                    init={particlesInit}
                    className="absolute inset-0 z-0 pointer-events-none"
                    options={{
                        background: { color: { value: "transparent" } },
                        fpsLimit: 120,
                        fullScreen: { enable: false },
                        interactivity: {
                            events: {
                                onHover: { enable: false },
                                onClick: { enable: false },
                                resize: true,
                            },
                        },
                        particles: {
                            number: {
                                density: { enable: true, width: 900, height: 900 },
                                value: 55,
                            },
                            color: { value: "#0d9488" },
                            shape: { type: "circle" },
                            opacity: { value: 0.6 },
                            size: { value: 2.8 },
                            links: {
                                enable: true,
                                distance: 130,
                                color: { value: "#0d9488" },
                                opacity: 0.4,
                                width: 1,
                            },
                            move: {
                                enable: true,
                                speed: 0.9,
                                direction: 0,
                                random: true,
                                straight: false,
                            },
                        },
                        detectRetina: true,
                    }}
                />
                <Card className="w-full max-w-md border-none shadow-none bg-transparent z-30">
                    <CardHeader className="space-y-1 text-center md:text-left">
                        <div className="flex justify-center md:justify-start mb-2">
                            <div className="p-2 bg-teal-600 rounded-lg">
                                <ShieldCheck size={24} className="text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight">Verificación en dos pasos</CardTitle>
                        <CardDescription>
                            {useBackup
                                ? "Ingresa uno de tus códigos de respaldo."
                                : "Ingresa el código de 6 dígitos de tu aplicación de autenticación."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none flex items-center gap-2">
                                    <KeyRound size={14} className="text-slate-400" />
                                    {useBackup ? 'Código de respaldo' : 'Código de verificación'}
                                </label>
                                <Input
                                    type="text"
                                    inputMode={useBackup ? 'text' : 'numeric'}
                                    autoComplete="one-time-code"
                                    placeholder={useBackup ? 'XXXXXXXX' : '000000'}
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    required
                                    autoFocus
                                    className="h-12 rounded-lg border-gray-200 bg-white text-gray-900 focus-visible:border-primary focus-visible:ring-primary/10 text-center text-lg tracking-[0.4em] px-3.5 placeholder:tracking-[0.4em] placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            {!useBackup && (
                                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={trustDevice}
                                        onChange={(e) => setTrustDevice(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    Confiar en este dispositivo por 60 días
                                </label>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.01]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Verificando...</span>
                                    </div>
                                ) : (
                                    'Verificar'
                                )}
                            </Button>
                        </form>

                        <button
                            type="button"
                            onClick={() => { setUseBackup((v) => !v); setCode(''); setError(''); }}
                            className="mt-4 text-sm text-primary hover:underline"
                        >
                            {useBackup ? 'Usar la app de autenticación' : '¿No tienes acceso? Usar un código de respaldo'}
                        </button>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 text-center">
                        <Link to="/login" className="text-sm text-slate-500 hover:text-primary transition-colors">
                            Volver al inicio de sesión
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
