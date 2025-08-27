// app/_layout.tsx
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { ToastProvider } from '../components/operario/ToastProvider';
import { ThemeProvider } from '../theme/ThemeProvider';
import { ActivityIndicator, View } from 'react-native';

function Gate() {
  // 1) Hooks siempre arriba
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !navState?.key) return;

    const group = segments?.[0];              // '(auth)' | '(admin)' | '(operario)' | '(modals)'
    const isAuth   = group === '(auth)';
    const isModal  = group === '(modals)';

    // Sin sesión → ir a login (permitimos modales públicos)
    if (!user) {
      if (!isModal && !isAuth) router.replace('/(auth)/login');
      return;
    }

    // Con sesión: mandar al grupo por rol si no coincide
    if (isModal) return; // no movemos nada si es modal

    if (user.rol === 'operario' && group !== '(operario)') {
      router.replace('/(operario)/HomeScreen');
      return;
    }
    if (user.rol === 'admin' && group !== '(admin)') {
      router.replace('/(admin)/HomeScreen');
      return;
    }
  }, [loading, navState?.key, segments, user, router]);

  // Mientras no esté lista la navegación o estamos cargando tokens → loader
  if (loading || !navState?.key) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Render estable del árbol actual (auth/admin/operario)
  return <Slot />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Gate />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
