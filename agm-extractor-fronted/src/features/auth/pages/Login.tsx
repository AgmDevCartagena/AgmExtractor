import { useCallback, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signIn } from '../../../lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock, AtSign, Radar } from 'lucide-react';

export default function Login() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // El identificador puede ser correo o usuario: si contiene '@' lo tratamos como email.
            const isEmail = identifier.includes('@');
            const { data, error: authError } = isEmail
                ? await signIn.email({ email: identifier.trim(), password })
                : await signIn.username({ username: identifier.trim().toLowerCase(), password });

            if (authError) {
                setError(authError.message || 'Credenciales incorrectas');
                return;
            }

            // Con 2FA activo no se crea la sesión aquí: hay que verificar el código primero.
            if ((data as { twoFactorRedirect?: boolean })?.twoFactorRedirect) {
                navigate('/login/2fa');
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

    const particlesInit = useCallback(async (engine: any) => {
        await loadSlim(engine);
    }, []);

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
                        Optimiza tu gestión jurídica con <span className="text-teal-400">inteligencia</span>.
                    </h2>
                    <p className="text-gray-400 text-lg leading-relaxed">
                        Extracción automática de procesos, seguimiento en tiempo real y análisis avanzado para profesionales del derecho.
                    </p>
                </div>

                <div className="absolute bottom-12 left-12 right-12 text-white-500 text-sm flex justify-between border-t border-white-800 pt-8">
                    <span>© 2026 INNOVAR</span>
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
                            paint: {
                                fill: {
                                    color: { value: "#0d9488" },
                                }
                            }
                        },
                        detectRetina: true,
                    }}
                />
                <Card className="w-full max-w-md border-none shadow-none bg-transparent z-30">
                    <CardHeader className="space-y-1 text-center md:text-left">
                        <div className="md:hidden flex justify-center mb-6">
                            <div className="p-2 bg-teal-600 rounded-lg">
                                <Radar size={24} className="text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight">Bienvenido</CardTitle>
                        <CardDescription>
                            Ingresa tus credenciales para acceder al sistema.
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
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                                    <AtSign size={14} className="text-slate-400" />
                                    Correo o usuario
                                </label>
                                <Input
                                    type="text"
                                    placeholder="nombre@empresa.com o tu usuario"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                    className="h-11 rounded-lg border-gray-200 bg-white text-gray-900 focus-visible:border-primary focus-visible:ring-primary/10 text-[14px] px-3.5 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                                        <Lock size={14} className="text-slate-400" />
                                        Contraseña
                                    </label>
                                    <Link to="/forgot-password" className="text-xs text-primary hover:underline">¿Olvidaste tu contraseña?</Link>
                                </div>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-11 rounded-lg border-gray-200 bg-white text-gray-900 focus-visible:border-primary focus-visible:ring-primary/10 text-[14px] px-3.5 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

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
                                    'Iniciar Sesión'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 text-center">
                        {/* <p className="text-sm text-slate-500">
                            ¿No tienes una cuenta? <Link to="/register" className="text-primary font-semibold hover:underline">Regístrate</Link>
                        </p> */}
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}