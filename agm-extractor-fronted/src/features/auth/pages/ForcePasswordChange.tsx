import { useState } from 'react';
import { changePassword, signOut, useSession } from '../../../lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, KeyRound, Lock, LogOut, Radar } from 'lucide-react';

export default function ForcePasswordChange() {
    const { refetch } = useSession();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 8) {
            setError('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (newPassword !== confirm) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        if (newPassword === currentPassword) {
            setError('La nueva contraseña debe ser distinta a la temporal.');
            return;
        }

        setIsLoading(true);
        try {
            const { error: authError } = await changePassword({
                currentPassword,
                newPassword,
                revokeOtherSessions: true,
            });
            if (authError) {
                setError(authError.message || 'No se pudo cambiar la contraseña. Revisa la contraseña temporal.');
                return;
            }
            // El flag mustChangePassword se limpia en el backend; recargamos la sesión.
            await refetch?.();
        } catch {
            setError('Error de conexión con el servidor.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-dvh flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="flex items-center justify-center gap-2.5">
                    <div className="p-1.5 bg-primary rounded-md ring-1 ring-primary/30 shadow-sm">
                        <Radar size={16} className="text-primary-foreground" />
                    </div>
                    <h1 className="text-base font-semibold text-foreground tracking-tight">RADAR</h1>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <KeyRound size={22} />
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-lg">Cambia tu contraseña temporal</CardTitle>
                                <CardDescription>
                                    Por seguridad, debes establecer una nueva contraseña antes de continuar.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2.5">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Lock size={14} className="text-slate-400" /> Contraseña temporal
                                </label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <KeyRound size={14} className="text-slate-400" /> Nueva contraseña
                                </label>
                                <Input
                                    type="password"
                                    placeholder="Mínimo 8 caracteres"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <KeyRound size={14} className="text-slate-400" /> Confirmar nueva contraseña
                                </label>
                                <Input
                                    type="password"
                                    placeholder="Repite la nueva contraseña"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    required
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Guardando...' : 'Cambiar contraseña'}
                            </Button>
                        </form>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 gap-2 text-muted-foreground"
                            onClick={() => signOut()}
                        >
                            <LogOut size={14} /> Cerrar sesión
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
