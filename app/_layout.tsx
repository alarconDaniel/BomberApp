// app/_layout.tsx
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '../auth/AuthContext';

function AuthGate() {
    const router   = useRouter();
    const segments = useSegments();            // p.ej. ['(auth)','login'] | ['(operario)','home'] | undefined
    const navState = useRootNavigationState(); // listo cuando tiene key
    const { user, loading } = useAuth();
    const routedRef = useRef(false);           // evita doble replace

    useEffect(() => {
        if (routedRef.current) return;
        if (loading || !navState?.key) return;

        const first      = segments[0];
        const inAuth     = first === '(auth)';
        const inOperario = first === '(operario)';
        const inAdmin    = first === '(admin)';

        // Sin sesión -> siempre empuja a login (estés donde estés)
        if (!user && !inAuth) {
            routedRef.current = true;
            router.replace('/(auth)/login');
            return;
        }

        // Con sesión -> lleva al grupo correcto si aún no estás en él
        if (user?.rol === 'operario' && !inOperario) {
            routedRef.current = true;
            router.replace('/(operario)/HomeScreen');
            return;
        }
        if (user?.rol === 'admin' && !inAdmin) {
            routedRef.current = true;
            router.replace('/(admin)');
            return;
        }
        // Si ya estás en el grupo correcto, no hacemos nada

    }, [user, loading, segments, navState?.key]);

    return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <AuthGate />
        </AuthProvider>
    );
}
