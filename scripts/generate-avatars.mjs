// scripts/generate-avatars.mjs
// Node 18+ / 20+ / 22 OK
// Ejecuta: npm run avatars:build
// Genera @1x/@2x/@3x desde assets/_originals/avatar/** hacia assets/avatar

import sharp from 'sharp';
import { globby } from 'globby';
import { dirname, join, parse } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Raíz del proyecto (carpeta que contiene "assets", "app", etc.)
const ROOT = join(__dirname, '..');

// ⚙️ Config global de avatares
const CONFIG = {
    // Patrón POSIX relativo a ROOT (admite png/jpg/jpeg/webp)
    srcPattern: 'assets/_originals/avatar/**/*.{png,jpg,jpeg,webp}',
    // Carpeta de destino
    destDir: 'assets/avatar',
    // Tamaño base @1x (ajústalo según tu UI real)
    basePointSize: 128,
    // 'cover' recorta y garantiza cuadrado; 'contain' conserva todo y rellena con transparencia
    fitMode: 'contain', // 'cover' | 'contain'
    // Si deseas avatares en círculo: true. De lo contrario, quedan cuadrado/rectangulares
    makeCircle: false,
    // Fuerza salida a PNG para consistencia de canal alfa y peso
    forcePngOutput: true,
};

// Escalas a generar
const SCALES = [1, 2, 3];

// Fondo transparente (para contain o para bordes tras máscara circular)
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

// Util: SVG circular como máscara (blanco = visible, negro/transparente = recortado)
function circleMaskSvg(size) {
    const r = size / 2;
    return Buffer.from(
        `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
       <circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/>
     </svg>`
    );
}

async function processAvatars() {
    // Buscar archivos de origen
    const files = await globby(CONFIG.srcPattern, {
        cwd: ROOT,
        expandDirectories: false,
        gitignore: false, // ¡no dependas de .gitignore!
        dot: true,
        absolute: true,
        caseSensitiveMatch: false,
    });

    console.log(`\n🧩 Avatares: patrón "${CONFIG.srcPattern}" (cwd=${ROOT})`);
    console.log(`   Encontrados: ${files.length}`);

    if (!files.length) {
        console.warn('⚠️  No se encontraron imágenes. Revisa la carpeta y extensiones.');
        return;
    }

    const destAbs = join(ROOT, CONFIG.destDir);
    if (!existsSync(destAbs)) mkdirSync(destAbs, { recursive: true });

    console.log(`   Destino: ${destAbs}`);
    console.log(`   Base @1x: ${CONFIG.basePointSize}px  → generará @2x y @3x`);
    console.log(`   Modo de ajuste: ${CONFIG.fitMode}  |  Máscara circular: ${CONFIG.makeCircle ? 'sí' : 'no'}`);

    let count = 0;

    for (const file of files) {
        const { name } = parse(file);
        // Evita reprocesar variantes ya generadas
        if (/@\dx$/.test(name)) continue;

        for (const scale of SCALES) {
            const targetPx = Math.round(CONFIG.basePointSize * scale);
            const suffix = scale === 1 ? '' : `@${scale}x`;

            // Forzar salida .png si se desea consistencia
            const outFileName = CONFIG.forcePngOutput ? `${name}${suffix}.png` : `${name}${suffix}${parse(file).ext}`;
            const outPath = join(destAbs, outFileName);

            // Construye el pipeline de sharp
            let pipeline = sharp(file)
                .resize({
                    width: targetPx,
                    height: targetPx,
                    fit: CONFIG.fitMode,
                    position: 'centre',
                    background: TRANSPARENT,
                    withoutEnlargement: true,
                });

            // Si pedimos avatares circulares, aplicamos máscara
            if (CONFIG.makeCircle) {
                pipeline = pipeline
                    // Asegura canal alfa antes de enmascarar
                    .ensureAlpha()
                    .composite([{ input: circleMaskSvg(targetPx), blend: 'dest-in' }]);
            }

            // Salida a PNG con paleta cuando sea posible
            pipeline = pipeline.png({ palette: true });

            await pipeline.toFile(outPath);

            console.log(`   ✓ ${outFileName}  (${targetPx}x${targetPx})`);
        }

        count++;
    }

    console.log(`   → Total avatares procesados: ${count}`);
}

async function run() {
    console.log('🛠️  Generador de avatares @1x/@2x/@3x\n');
    await processAvatars();
    console.log('\n✨ Listo. Revisa assets/avatar');
}

run().catch((err) => {
    console.error('❌ Error en el generador:', err);
    process.exit(1);
});
