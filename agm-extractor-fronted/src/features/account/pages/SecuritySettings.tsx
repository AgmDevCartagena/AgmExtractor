import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { twoFactor, useSession } from '../../../lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertCircle, ArrowLeft, CheckCircle2, Copy, Download, KeyRound,
    Lock, Radar, ShieldCheck, ShieldOff,
} from 'lucide-react';

type Step = 'idle' | 'password' | 'verify' | 'disable';

export default function SecuritySettings() {
    const { data: session, refetch } = useSession();
    const navigate = useNavigate();

    const isEnabled = Boolean((session?.user as { twoFactorEnabled?: boolean })?.twoFactorEnabled);

    const [step, setStep] = useState<Step>('idle');
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [totpURI, setTotpURI] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const reset = () => {
        setStep('idle');
        setPassword('');
        setCode('');
        setTotpURI('');
        setBackupCodes([]);
        setError('');
    };

    // Paso 1: pedir contraseña y generar el secreto + códigos de respaldo.
    const handleEnable = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const { data, error: authError } = await twoFactor.enable({ password });
            if (authError) {
                setError(authError.message || 'No se pudo iniciar la activación. Revisa tu contraseña.');
                return;
            }
            if (data) {
                setTotpURI(data.totpURI);
                setBackupCodes(data.backupCodes ?? []);
                setStep('verify');
            }
        } catch {
            setError('Error de conexión con el servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    // Paso 2: confirmar con un código TOTP para activar definitivamente.
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const { error: authError } = await twoFactor.verifyTotp({ code: code.trim() });
            if (authError) {
                setError(authError.message || 'Código incorrecto. Inténtalo de nuevo.');
                return;
            }
            await refetch?.();
            setSuccess('La autenticación en dos pasos quedó activada.');
            reset();
        } catch {
            setError('Error de conexión con el servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDisable = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const { error: authError } = await twoFactor.disable({ password });
            if (authError) {
                setError(authError.message || 'No se pudo desactivar. Revisa tu contraseña.');
                return;
            }
            await refetch?.();
            setSuccess('La autenticación en dos pasos quedó desactivada.');
            reset();
        } catch {
            setError('Error de conexión con el servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    const copyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n'));
        setSuccess('Códigos de respaldo copiados.');
    };

    const downloadBackupCodes = () => {
        const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'radar-codigos-respaldo.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-dvh bg-background">
            <header className="bg-card/80 backdrop-blur-md border-b sticky top-0 z-30">
                <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/')}>
                        <ArrowLeft size={16} />
                        <span>Volver</span>
                    </Button>
                    <div className="flex items-center gap-2.5 ml-auto">
                        <div className="p-1.5 bg-primary rounded-md ring-1 ring-primary/30 shadow-sm">
                            <Radar size={15} className="text-primary-foreground" />
                        </div>
                        <h1 className="text-sm font-semibold text-foreground tracking-tight">RADAR</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">Seguridad de la cuenta</h2>
                    <p className="text-sm text-muted-foreground">
                        Administra la autenticación en dos pasos (2FA) para proteger tu acceso.
                    </p>
                </div>

                {success && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-700 text-sm rounded-lg flex items-center gap-3">
                        <CheckCircle2 size={18} />
                        <span>{success}</span>
                    </div>
                )}
                {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-3">
                        <AlertCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${isEnabled ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                                {isEnabled ? <ShieldCheck size={22} /> : <ShieldOff size={22} />}
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-lg">Autenticación en dos pasos</CardTitle>
                                <CardDescription>
                                    {isEnabled
                                        ? 'Está activa. Se te pedirá un código al iniciar sesión.'
                                        : 'Añade una capa extra de seguridad con una app de autenticación (TOTP).'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Estado activo */}
                        {isEnabled && step === 'idle' && (
                            <Button variant="destructive" className="gap-2" onClick={() => { setSuccess(''); setStep('disable'); }}>
                                <ShieldOff size={16} />
                                Desactivar 2FA
                            </Button>
                        )}

                        {/* Estado inactivo: iniciar activación */}
                        {!isEnabled && step === 'idle' && (
                            <Button className="gap-2" onClick={() => { setSuccess(''); setStep('password'); }}>
                                <ShieldCheck size={16} />
                                Activar 2FA
                            </Button>
                        )}

                        {/* Paso 1: contraseña para activar */}
                        {step === 'password' && (
                            <form onSubmit={handleEnable} className="space-y-4 max-w-sm">
                                <p className="text-sm text-muted-foreground">Confirma tu contraseña para continuar.</p>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Lock size={14} className="text-slate-400" /> Contraseña
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? 'Procesando...' : 'Continuar'}
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={reset}>Cancelar</Button>
                                </div>
                            </form>
                        )}

                        {/* Paso 2: QR + códigos + verificación */}
                        {step === 'verify' && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row gap-6 items-start">
                                    <div className="bg-white p-3 rounded-xl border shrink-0">
                                        {totpURI && <QRCodeSVG value={totpURI} size={168} />}
                                    </div>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p className="font-medium text-foreground">1. Escanea el código QR</p>
                                        <p>Usa Google Authenticator, Authy o similar para escanear el código.</p>
                                        <p className="font-medium text-foreground pt-2">2. Guarda tus códigos de respaldo</p>
                                        <p>Te permiten entrar si pierdes el acceso a la app. Guárdalos en un lugar seguro.</p>
                                    </div>
                                </div>

                                {backupCodes.length > 0 && (
                                    <div className="rounded-lg border bg-muted/40 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-sm font-medium flex items-center gap-2">
                                                <KeyRound size={14} /> Códigos de respaldo
                                            </span>
                                            <div className="flex gap-2">
                                                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={copyBackupCodes}>
                                                    <Copy size={13} /> Copiar
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={downloadBackupCodes}>
                                                    <Download size={13} /> Descargar
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-sm">
                                            {backupCodes.map((c) => (
                                                <span key={c} className="bg-background rounded px-2 py-1 text-center border">{c}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleVerify} className="space-y-3 max-w-sm">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <KeyRound size={14} className="text-slate-400" /> 3. Ingresa el código de 6 dígitos
                                    </label>
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        placeholder="000000"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        required
                                        className="text-center text-lg tracking-[0.4em]"
                                    />
                                    <div className="flex gap-2">
                                        <Button type="submit" disabled={isLoading}>
                                            {isLoading ? 'Verificando...' : 'Activar'}
                                        </Button>
                                        <Button type="button" variant="ghost" onClick={reset}>Cancelar</Button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Desactivar */}
                        {step === 'disable' && (
                            <form onSubmit={handleDisable} className="space-y-4 max-w-sm">
                                <p className="text-sm text-muted-foreground">Confirma tu contraseña para desactivar la 2FA.</p>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Lock size={14} className="text-slate-400" /> Contraseña
                                    </label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button type="submit" variant="destructive" disabled={isLoading}>
                                        {isLoading ? 'Procesando...' : 'Desactivar 2FA'}
                                    </Button>
                                    <Button type="button" variant="ghost" onClick={reset}>Cancelar</Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
