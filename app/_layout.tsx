// app/_layout.tsx
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { ToastProvider } from '../components/operario/ToastProvider';
import { ThemeProvider } from '../theme/ThemeProvider';

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !navState?.key) return;

    const group = segments?.[0];
    const isModal = group === '(modals)';

    // 1) Sin sesión → login (salvo modales públicos)
    if (!user) {
      if (!isModal && group !== '(auth)') router.replace('/(auth)/login');
      return;
    }

    // 2) Con sesión y no es modal → forzar grupo por rol
    if (isModal) return;

    if (user.rol === 'operario' && group !== '(operario)') {
      router.replace('/(operario)/HomeScreen');
      return;
    }
    if (user.rol === 'admin' && group !== '(admin)') {
      router.replace('/(admin)/HomeScreen');
      return;
    }
    // Ya está en el grupo correcto
  }, [user, loading, navState?.key, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AuthGate />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
