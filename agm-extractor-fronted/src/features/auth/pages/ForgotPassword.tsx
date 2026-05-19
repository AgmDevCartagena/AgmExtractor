import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestPasswordReset } from '../../../lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Mail, Scale, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const { error: authError } = await requestPasswordReset({
                email,
                redirectTo: '/reset-password',
            });

            if (authError) {
                setError(authError.message || 'Error al enviar el correo de recuperación');
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
                        Recupera el <span className="text-blue-400">acceso</span> a tu cuenta.
                    </h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        Ingresa tu correo electrónico y te enviaremos las instrucciones para restablecer tu contraseña de forma segura.
                    </p>
                </div>
                
                <div className="absolute bottom-12 left-12 right-12 text-slate-500 text-sm flex justify-between border-t border-slate-800 pt-8">
                    <span>© 2026 AGM RADAR</span>
                    <span>Versión 1.0.0</span>
                </div>
            </div>

            {/* Form Side */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                <Card className="w-full max-w-md border-none shadow-none bg-transparent md:bg-white md:border md:shadow-sm">
                    <CardHeader className="space-y-1 text-center md:text-left">
                        <div className="md:hidden flex justify-center mb-6">
                           <div className="p-2 bg-blue-600 rounded-lg">
                               <Scale size={24} className="text-white" />
                           </div>
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight">Recuperar contraseña</CardTitle>
                        <CardDescription>
                            {isSuccess 
                                ? "Revisa tu bandeja de entrada." 
                                : "Ingresa tu correo para recibir un enlace de recuperación."}
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
                                    <p className="text-slate-600">
                                        Hemos enviado un correo a <span className="font-semibold text-slate-900">{email}</span> con las instrucciones.
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        Si no lo recibes en unos minutos, revisa tu carpeta de spam.
                                    </p>
                                </div>
                                <Button 
                                    onClick={() => navigate('/login')}
                                    className="w-full h-11"
                                >
                                    Volver al inicio de sesión
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-5">
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

                                <Button 
                                    type="submit" 
                                    className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.01]"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Enviando...</span>
                                        </div>
                                    ) : (
                                        'Enviar enlace de recuperación'
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 text-center">
                        <Link to="/login" className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-2 transition-colors">
                            <ArrowLeft size={14} />
                            Volver al inicio de sesión
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}