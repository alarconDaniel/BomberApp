// utils/sound.ts
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

let enabled = true;

type SoundKey = 'monedas' | 'toggle';

const SOUND_FILES: Record<SoundKey, number> = {
    toggle: require('../assets/sounds/toggle.wav'),
    monedas: require('../assets/sounds/monedas.wav'), // 👈 corregido: key correcta
};

const cache = new Map<SoundKey, Audio.Sound>();

/**
 * Configura el audio para efectos (una sola vez por app).
 * Llama a esta función pronto (por ejemplo en la primera pantalla montada).
 */
export async function initSoundEngine() {
    try {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            playsInSilentModeIOS: true,         // iOS: sonar en modo silencio
            staysActiveInBackground: false,
            shouldDuckAndroid: true,            // Android: baja otras apps si reproduce
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            playThroughEarpieceAndroid: false,
        });
    } catch {
        // Nunca romper la UI por audio
    }
}

/** Habilita/inhabilita globalmente los efectos de sonido. */
export function setSoundsEnabled(value: boolean) {
    enabled = value;
}

/** Obtiene (y si hace falta crea) la instancia de Audio.Sound para una key. */
async function getOrCreateSound(key: SoundKey): Promise<Audio.Sound> {
    let sound = cache.get(key);
    if (!sound) {
        sound = new Audio.Sound();
        cache.set(key, sound);
    }
    // Cargar solo si no está cargado
    try {
        const status = await sound.getStatusAsync();

        const isLoaded = (status as any)?.isLoaded === true;
        if (!isLoaded) {
            await sound.loadAsync(SOUND_FILES[key], { shouldPlay: false }, true);
        }
    } catch {
        // Si getStatusAsync falla por estado inválido, reintenta cargando
        try {
            await sound.unloadAsync().catch(() => {});
            await sound.loadAsync(SOUND_FILES[key], { shouldPlay: false }, true);
        } catch {
            // seguir silenciosamente
        }
    }
    return sound;
}

/** Reproduce un sonido corto; si no está cargado, lo carga y lo cachea. */
export async function play(key: SoundKey) {
    if (!enabled) return;
    try {
        const sound = await getOrCreateSound(key);

        // Si ya está sonando, reinicia desde el inicio. replayAsync lo hace en 1 llamada.
        await sound.replayAsync();
    } catch {
        // Nunca lanzar por audio
    }
}

/** Libera recursos (opcional). A prueba de bombas. */
export async function unloadAll() {
    const tasks: Promise<void>[] = [];

    cache.forEach((sound) => {
        if (!sound) return;

        tasks.push(
            (async () => {
                try {
                    // Solo intenta descargar si está cargado
                    const status = await sound.getStatusAsync().catch(() => null);
                    const isLoaded =
                        status && typeof status === 'object' && 'isLoaded' in status
                            ?
                            Boolean((status as any).isLoaded)
                            : false;

                    if (isLoaded && typeof sound.unloadAsync === 'function') {
                        await sound.unloadAsync();
                    }
                } catch {
                    // ignorar cualquier cosa (ya descargado, estado inválido, etc.)
                }
            })()
        );
    });

    cache.clear();
    try {
        await Promise.all(tasks);
    } catch {
        // ignorar errores de descarga
    }
}

