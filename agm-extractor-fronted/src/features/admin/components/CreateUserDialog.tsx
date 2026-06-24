import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { X, UserPlus, Loader2 } from 'lucide-react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminUserMutations } from '../hooks/useAdminUsers';

const phoneStyles = `
.phone-input-admin { display: flex; align-items: center; gap: 0.5rem; height: 2.25rem; }
.phone-input-admin .PhoneInputCountry {
    border-radius: 0.375rem;
    border: 1px solid var(--color-input);
    padding: 0 0.625rem;
    height: 100%;
    box-sizing: border-box;
    cursor: pointer;
    transition: border-color 0.15s ease;
}
.phone-input-admin .PhoneInputCountry:hover,
.phone-input-admin .PhoneInputCountry:focus-within { border-color: var(--color-ring); }
.phone-input-admin .PhoneInputCountryIconImg { width: 1.5rem; height: 1.125rem; object-fit: cover; border-radius: 2px; }
.phone-input-admin .PhoneInputCountrySelect { cursor: pointer; }
.phone-input-admin .PhoneInputInput {
    height: 100%;
    border-radius: 0.375rem;
    border: 1px solid var(--color-input);
    background: transparent;
    color: var(--color-foreground);
    padding: 0 0.75rem;
    font-size: 0.875rem;
    outline: none;
    width: 100%;
    flex: 1;
    box-sizing: border-box;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.phone-input-admin .PhoneInputInput::placeholder { color: var(--color-muted-foreground); }
.phone-input-admin .PhoneInputInput:focus { border-color: var(--color-ring); box-shadow: 0 0 0 1px var(--color-ring); }
`;

interface CreateUserDialogProps {
    open: boolean;
    onClose: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9._-]{3,}$/;

const emptyForm = {
    name: '',
    username: '',
    email: '',
    empresa: '',
    telefono: '',
    password: '',
    role: 'user' as 'user' | 'admin',
};

export default function CreateUserDialog({ open, onClose }: CreateUserDialogProps) {
    const { createUser } = useAdminUserMutations();
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (open) setForm(emptyForm);
    }, [open]);

    if (!open) return null;

    const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const username = form.username.trim().toLowerCase();
        if (!form.name.trim()) return toast.error('El nombre es obligatorio.');
        if (!USERNAME_RE.test(username))
            return toast.error('El usuario debe tener al menos 3 caracteres: letras, números, ".", "-" o "_".');
        if (!EMAIL_RE.test(form.email)) return toast.error('Email inválido.');
        if (!form.telefono.trim()) return toast.error('El teléfono es obligatorio.');
        if (form.password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres.');

        try {
            await createUser.mutateAsync({
                name: form.name.trim(),
                username,
                email: form.email.trim(),
                empresa: form.empresa.trim() || undefined,
                telefono: form.telefono.trim().replace('+', ''),
                password: form.password,
                role: form.role,
            });
            toast.success('Usuario registrado correctamente.');
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo registrar el usuario.');
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <style>{phoneStyles}</style>
            <div
                className="relative w-full max-w-md bg-card rounded-xl shadow-2xl overflow-hidden animate-modal-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <UserPlus size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-foreground tracking-tight">Registrar usuario</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Crea una cuenta nueva en RADAR.</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8 shrink-0 cursor-pointer">
                        <X size={16} />
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
                    <Field label="Nombre">
                        <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nombre completo" autoFocus />
                    </Field>
                    <Field label="Usuario">
                        <Input
                            value={form.username}
                            onChange={(e) => set('username', e.target.value)}
                            placeholder="juanperez"
                            autoCapitalize="none"
                            autoCorrect="off"
                        />
                    </Field>
                    <Field label="Email">
                        <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
                    </Field>
                    <Field label="Empresa">
                        <Input value={form.empresa} onChange={(e) => set('empresa', e.target.value)} placeholder="Nombre de la empresa (opcional)" />
                    </Field>
                    <Field label="Teléfono">
                        <PhoneInput
                            international
                            defaultCountry="CO"
                            value={form.telefono || undefined}
                            onChange={(v) => set('telefono', v ?? '')}
                            placeholder="3012345678"
                            className="phone-input-admin"
                        />
                    </Field>
                    <Field label="Contraseña temporal">
                        <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Mínimo 8 caracteres" />
                        <p className="text-[11px] text-muted-foreground">El usuario deberá cambiarla en su primer ingreso.</p>
                    </Field>
                    <Field label="Rol">
                        <select
                            value={form.role}
                            onChange={(e) => set('role', e.target.value)}
                            className="h-9 w-full rounded-md border bg-background px-3 text-[13px] text-foreground cursor-pointer"
                        >
                            <option value="user">Usuario</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </Field>

                    <div className="flex justify-end gap-2.5 pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
                            Cancelar
                        </Button>
                        <Button type="submit" size="sm" disabled={createUser.isPending} className="cursor-pointer gap-1.5">
                            {createUser.isPending && <Loader2 size={14} className="animate-spin" />}
                            Registrar
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-foreground">{label}</label>
            {children}
        </div>
    );
}
