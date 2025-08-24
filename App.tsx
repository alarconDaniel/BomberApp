// App.tsx
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import StackNavigator from './navigation/StackNavigator';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './auth/AuthContext';

import { BASE_URL } from './config/api';

// 🛡️ Guard que reescribe URLs sin /api
function installFetchGuard() {
  const orig = global.fetch;
  global.fetch = (input: any, init?: RequestInit) => {
    try {
      const raw = typeof input === 'string' ? input : String(input);
      // Si apunta a :puerto/(archivos|usuario|reto)/... y NO contiene /api/ → reescribe
      if (/^https?:\/\/[^/]+:\d+\/(archivos|usuario|reto)\//i.test(raw) && !/\/api\//i.test(raw)) {
        const fixed = raw.replace(/^(https?:\/\/[^/]+:\d+)(\/.*)$/i, '$1/api$2');
        console.log('🛠️ fetchGuard: reescrito', raw, '→', fixed);
        return orig(fixed, init);
      }
    } catch {}
    return orig(input as any, init);
  };
}
installFetchGuard();

export default function App() {
  useEffect(() => {
    console.log('[API] BASE_URL en runtime =', BASE_URL);
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <NavigationContainer>
          <StackNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </AuthProvider>
  );
}
