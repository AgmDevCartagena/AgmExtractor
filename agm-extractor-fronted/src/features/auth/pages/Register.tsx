import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signUp } from '../../../lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lock, Mail, Phone, Scale, User } from 'lucide-react';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+57');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            setIsLoading(false);
            return;
        }

        const cleanCountryCode = countryCode.replace('+', '');
        const finalPhoneNumber = `${cleanCountryCode}${phone}`;

        try {
            const { data, error: authError } = await signUp.email({
                email,
                password,
                name,
                // @ts-expect-error: Better Auth frontend no conoce los campos adicionales del backend
                telefono: finalPhoneNumber,
            });

            if (authError) {
                setError(authError.message || 'Error al crear la cuenta');
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
                        <h1 className="text-4xl font-black tracking-tighter">Extractor</h1>
                    </div>
                    <h2 className="text-5xl font-bold mb-6 leading-tight">
                        Únete a la <span className="text-blue-400">revolución</span> jurídica.
                    </h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Crea tu cuenta y comienza a optimizar tu gestión legal con tecnología de última generación.
                    </p>
                </div>

                <div className="absolute bottom-12 left-12 right-12 text-slate-500 text-sm flex justify-between border-t border-slate-800 pt-8">
                    <span>© 2026 AGM Extractor</span>
                    <span>Versión 2.0.0</span>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                <Card className="w-full max-w-md border-none shadow-none bg-transparent md:bg-white md:border md:shadow-sm">
                    <CardHeader className="space-y-1 text-center md:text-left">
                        <div className="md:hidden flex justify-center mb-6">
                            <div className="p-2 bg-blue-600 rounded-lg">
                                <Scale size={24} className="text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight">Crear Cuenta</CardTitle>
                        <CardDescription>
                            Ingresa tus datos para registrarte en el sistema.
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
                                    <User size={14} className="text-slate-400" />
                                    Nombre Completo
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Juan Pérez"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="bg-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                                    <Phone size={14} className="text-slate-400" />
                                    Número de Teléfono
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="flex h-9 w-[100px] rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="+57">+57 (COL)</option>
                                        <option value="+1">+1 (USA)</option>
                                        <option value="+34">+34 (ESP)</option>
                                        <option value="+52">+52 (MEX)</option>
                                        <option value="+54">+54 (ARG)</option>
                                        <option value="+56">+56 (CHI)</option>
                                        <option value="+51">+51 (PER)</option>
                                    </select>
                                    <Input
                                        type="tel"
                                        placeholder="3012345678"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        required
                                        className="bg-white flex-1"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                                    <Mail size={14} className="text-slate-400" />
                                    Correo Electrónico
                                </label>
                                <Input
                                    type="email"
                                    placeholder="nombre@empresa.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2">
                                    <Lock size={14} className="text-slate-400" />
                                    Contraseña
                                </label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-white"
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
                                    className="bg-white"
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
                                        <span>Creando cuenta...</span>
                                    </div>
                                ) : (
                                    'Registrarse'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 text-center">
                        <p className="text-sm text-slate-500">
                            ¿Ya tienes una cuenta? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Iniciar Sesión</Link>
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}