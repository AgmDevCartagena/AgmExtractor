import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import Dashboard from './features/extractor/pages/Dashboard';
import { useSession } from './lib/auth-client';

export default function App() {
    const { data: session, isPending } = useSession();

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-blue-600 font-bold text-xl animate-pulse">
                    Cargando Radar...
                </div>
            </div>
        );
    }

    return (
        <Routes>
            {!session ? (
                <>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </>
            ) : (
                <Route path="*" element={<Dashboard />} />
            )}
        </Routes>
    );
}