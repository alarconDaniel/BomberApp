// auth/getGatewayBaseUrl.ts
import Constants from 'expo-constants';

export function getGatewayBaseUrl(port: number): string {
    // Esto funciona bien en Expo Go / dev
    const debuggerHost =
        (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
        (Constants as any).manifest?.debuggerHost;

    if (debuggerHost) {
        const host = debuggerHost.split(':')[0]; // "192.168.20.20:19000" -> "192.168.20.20"
        return `http://${host}:${port}`;
    }

    // Fallback por si acaso
    return `http://localhost:${port}`;
}
