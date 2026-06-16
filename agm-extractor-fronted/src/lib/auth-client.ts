import { createAuthClient } from "better-auth/react";
import { usernameClient, twoFactorClient, adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_CLIENT_URL,
    plugins: [usernameClient(), twoFactorClient(), adminClient()],
});

export const {
    useSession,
    signIn,
    signOut,
    signUp,
    requestPasswordReset,
    resetPassword,
    twoFactor,
    admin,
} = authClient;
