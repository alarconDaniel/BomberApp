// scripts/generate-icons.mjs
// Node 18+ / 20+ / 22 OK
// Ejecuta: npm run icons:build
// Genera @1x/@2x/@3x para items, logros y trofeos desde assets/_originals/**

import sharp from 'sharp';
import { globby } from 'globby';
import { dirname, join, parse } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Raíz del proyecto (carpeta que contiene "assets", "app", etc.)
const ROOT = join(__dirname, '..');

// Configura tus sets aquí (ajusta basePointSize según tu UI real)
const SETS = [
    {
        label: 'items',
        // IMPORTANTE: patrones POSIX (con /), relativos a ROOT
        srcPattern: 'assets/_originals/items/*.png',
        destDir: 'assets/icons/items',
        basePointSize: 64,
    },
    {
           label: 'logros',
            srcPattern: 'assets/_originals/logros/!*.png',
            destDir: 'assets/icons/logros',
            basePointSize: 76,
        },
        {
            label: 'trofeos',
            srcPattern: 'assets/_originals/trofeos/!*.png',
            destDir: 'assets/icons/trofeos',
            basePointSize: 76,
        },
];

const SCALES = [1, 2, 3];
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

async function processSet(set) {
    // Buscamos desde ROOT con globby (sin respetar .gitignore)
    const files = await globby(set.srcPattern, {
        cwd: ROOT,
        expandDirectories: false,
        gitignore: false, // <- clave: NO usar .gitignore para filtrar
        dot: true,
        absolute: true, // devuelve paths absolutos; más fácil para sharp
        caseSensitiveMatch: false,
    });

    console.log(`\n📦 ${set.label}: patrón "${set.srcPattern}" (cwd=${ROOT})`);
    console.log(`   Encontrados: ${files.length}`);

    if (!files.length) {
        console.warn(`⚠️  No se encontraron PNG para ${set.label}. Revisa la carpeta y extensiones.`);
        return;
    }

    const destAbs = join(ROOT, set.destDir);
    if (!existsSync(destAbs)) mkdirSync(destAbs, { recursive: true });

    console.log(`   Destino: ${destAbs}`);
    console.log(`   Base @1x: ${set.basePointSize}px  → generará @2x y @3x`);

    let count = 0;

    for (const file of files) {
        const { name, ext } = parse(file);
        if (/@\dx$/.test(name)) continue; // evita reprocesar variantes ya generadas

        for (const scale of SCALES) {
            const targetPx = Math.round(set.basePointSize * scale);
            const suffix = scale === 1 ? '' : `@${scale}x`;
            const outPath = join(destAbs, `${name}${suffix}${ext}`);
            await sharp(file)
                .resize({
                    width: targetPx,
                    height: targetPx,
                    fit: 'contain',
                    background: transparent,
                    withoutEnlargement: true,
                })
                .png({ palette: true })
                .toFile(outPath);

            console.log(`   ✓ ${name}${suffix}${ext}  (${targetPx}x${targetPx})`);
        }

        count++;
    }

    console.log(`   → Total ${set.label} procesados: ${count}`);
}

async function run() {
    console.log('🛠️  Generador de íconos @1x/@2x/@3x\n');
    for (const set of SETS) {
        await processSet(set);
    }
    console.log('\n✨ Listo. Revisa assets/icons/{items,logros,trofeos}');
}

run().catch((err) => {
    console.error('❌ Error en el generador:', err);
    process.exit(1);
});
