import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import ForgotPassword from './features/auth/pages/ForgotPassword';
import ResetPassword from './features/auth/pages/ResetPassword';
import TwoFactorVerify from './features/auth/pages/TwoFactorVerify';
import SecuritySettings from './features/account/pages/SecuritySettings';
import Dashboard from './features/extractor/pages/Dashboard';
import { useSession } from './lib/auth-client';
import { Radar } from 'lucide-react';

export default function App() {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return (
            <div className="min-h-dvh flex flex-col items-center justify-center gap-3 bg-background">
                <Radar size={28} className="text-primary animate-pulse-soft" />
                <p className="text-sm font-medium text-muted-foreground tracking-tight">
                    Cargando RADAR...
                </p>
            </div>
        );
    }

    return (
        <Routes>
            {!session ? (
                <>
                    <Route path="/login" element={<Login />} />
                    <Route path="/login/2fa" element={<TwoFactorVerify />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </>
            ) : (
                <>
                    <Route path="/cuenta/seguridad" element={<SecuritySettings />} />
                    <Route path="*" element={<Dashboard />} />
                </>
            )}
        </Routes>
    );
}