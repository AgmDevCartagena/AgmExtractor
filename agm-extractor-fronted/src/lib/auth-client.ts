import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_CLIENT_URL,
});

export const { useSession, signIn, signOut, signUp, requestPasswordReset, resetPassword } = authClient;