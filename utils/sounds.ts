// utils/sound.ts
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

let enabled = true;

type SoundKey = 'monedas' | 'switch' | 'claxon' | 'reversa';

const SOUND_FILES: Record<SoundKey, number> = {
    switch: require('../assets/sounds/switch.wav'),
    monedas: require('../assets/sounds/monedas.wav'),
    claxon: require('../assets/sounds/claxon.wav'),
    reversa: require('../assets/sounds/reversa.wav'),
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
    }
}

export function setSoundsEnabled(value: boolean) {
    enabled = value;
}

async function getOrCreateSound(key: SoundKey): Promise<Audio.Sound> {
    let sound = cache.get(key);
    if (!sound) {
        sound = new Audio.Sound();
        cache.set(key, sound);
    }
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
        }
    }
    return sound;
}

export async function play(key: SoundKey) {
    if (!enabled) return;
    try {
        const sound = await getOrCreateSound(key);

        await sound.replayAsync();
    } catch {
    }
}

export async function unloadAll() {
    const tasks: Promise<void>[] = [];

    cache.forEach((sound) => {
        if (!sound) return;

        tasks.push(
            (async () => {
                try {
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
                }
            })()
        );
    });

    cache.clear();
    try {
        await Promise.all(tasks);
    } catch {
    }
}