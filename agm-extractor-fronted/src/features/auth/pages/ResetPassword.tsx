import { useCallback, useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../../../lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock, Scale, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [searchParams] = useSearchParams();

    const navigate = useNavigate();
    const token = searchParams.get('token');

    const particlesInit = useCallback(async (engine: any) => {
        await loadSlim(engine);
    }, []);

    useEffect(() => {
        if (!token) {
            setError('El token de restablecimiento no es válido o ha expirado.');
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            setError('Token faltante.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { error: authError } = await resetPassword({
                newPassword: password,
                token: token,
            });

            if (authError) {
                setError(authError.message || 'Error al restablecer la contraseña');
                return;
            }

            setIsSuccess(true);
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
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]"></div>
                </div>

                <div className="relative z-10 max-w-lg">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                            <Scale size={32} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter">RADAR</h1>
                    </div>
                    <h2 className="text-5xl font-bold mb-6 leading-tight">
                        Asegura tu <span className="text-blue-400">cuenta</span> con una nueva clave.
                    </h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Crea una contraseña segura que no hayas utilizado anteriormente para proteger tu acceso al sistema.
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
                            color: { value: "#155dfc" },
                            shape: { type: "circle" },
                            opacity: { value: 0.6 },
                            size: { value: 2.8 },
                            links: {
                                enable: true,
                                distance: 130,
                                color: { value: "#155dfc" },
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
                                    color: { value: "#155dfc" },
                                }
                            }
                        },
                        detectRetina: true,
                    }}
                />
                <Card className="w-full max-w-md border-none shadow-none bg-transparent z-30">
                    <CardHeader className="space-y-1 text-center md:text-left">
                        <div className="md:hidden flex justify-center mb-6">
                            <div className="p-2 bg-blue-600 rounded-lg">
                                <Scale size={24} className="text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight">Nueva contraseña</CardTitle>
                        <CardDescription>
                            {isSuccess
                                ? "¡Contraseña actualizada!"
                                : "Establece tu nueva contraseña de acceso."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        {isSuccess ? (
                            <div className="space-y-6 text-center py-4">
                                <div className="flex justify-center">
                                    <div className="p-4 bg-green-100 rounded-full text-green-600">
                                        <CheckCircle2 size={48} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-slate-600 text-lg">
                                        Tu contraseña ha sido restablecida exitosamente.
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        Ya puedes iniciar sesión con tu nueva clave.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => navigate('/login')}
                                    className="w-full h-11"
                                >
                                    Ir al inicio de sesión
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                                        <Lock size={14} className="text-slate-400" />
                                        Nueva Contraseña
                                    </label>
                                        <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={!token || isLoading}
                                        className="h-11 rounded-lg border-gray-200 bg-white focus-visible:border-primary focus-visible:ring-primary/10 text-[14px] px-3.5 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                                        <Lock size={14} className="text-slate-400" />
                                        Confirmar Contraseña
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        disabled={!token || isLoading}
                                        className="h-11 rounded-lg border-gray-200 bg-white focus-visible:border-primary focus-visible:ring-primary/10 text-[14px] px-3.5 placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.01]"
                                    disabled={!token || isLoading}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Restableciendo...</span>
                                        </div>
                                    ) : (
                                        'Restablecer contraseña'
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 text-center">
                        <Link to="/login" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                            Volver al inicio de sesión
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}