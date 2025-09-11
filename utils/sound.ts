// utils/sound.ts
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

let enabled = true;

export type SoundKey = 'monedas' | 'switch' | 'claxon' | 'reversa' | 'campana' | 'eliminar' | 'romper';

const SOUND_FILES: Record<SoundKey, number> = {
    switch: require('../assets/sounds/switch.wav'),
    monedas: require('../assets/sounds/monedas.wav'), // 👈 AQUI IMPORTA
    claxon: require('../assets/sounds/claxon.wav'),
    reversa: require('../assets/sounds/reversa.wav'),
    campana: require('../assets/sounds/campana.wav'),
    eliminar: require('../assets/sounds/eliminar.wav'),
    romper: require('../assets/sounds/romper.wav'),
};

const cache = new Map<SoundKey, Audio.Sound>();

export async function initSoundEngine() {
    try {
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            interruptionModeIOS: InterruptionModeIOS.DoNotMix,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
            playThroughEarpieceAndroid: false,
        });
    } catch {}
}

export function setSoundsEnabled(value: boolean) {
    enabled = value;
}

export async function preloadAll() {
    const keys: SoundKey[] = Object.keys(SOUND_FILES) as SoundKey[];
    await Promise.all(keys.map(async (k) => {
        try {
            const snd = await getOrCreateSound(k);
            await snd.getStatusAsync();
        } catch {}
    }));
}

async function getOrCreateSound(key: SoundKey): Promise<Audio.Sound> {
    let sound = cache.get(key);
    if (!sound) {
        sound = new Audio.Sound();
        cache.set(key, sound);
    }
    try {
        const status = await sound.getStatusAsync();
        if (!(status as any)?.isLoaded) {
            await sound.loadAsync(SOUND_FILES[key], { shouldPlay: false }, true);
        }
    } catch {
        try {
            await sound.unloadAsync().catch(() => {});
            await sound.loadAsync(SOUND_FILES[key], { shouldPlay: false }, true);
        } catch {}
    }
    return sound;
}

export async function play(key: SoundKey) {
    if (!enabled) return;
    try {
        const sound = await getOrCreateSound(key);
        await sound.replayAsync();
    } catch {}
}
