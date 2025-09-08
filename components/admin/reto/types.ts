// components/admin/reto/types.ts
export type TipoKey = 'multiple' | 'match' | 'fill';

export type BloqueMultiple = {
    kind: 'multiple';
    enunciado: string;
    puntos: number;
    tiempoSeg: number;
    opciones: { id: string; texto: string; correcta?: boolean }[];
    allowMultiple: boolean;
};

export type BloqueMatch = {
    kind: 'match';
    enunciado: string;
    puntos: number;
    tiempoSeg: number;
    pares: { id: string; izquierda: string; derecha: string }[];
};

export type BloqueFill = {
    kind: 'fill';
    enunciado: string;
    puntos: number;
    tiempoSeg: number;
    respuesta: string;
    pista?: string;
};

export type BloquePregunta = BloqueMultiple | BloqueMatch | BloqueFill;

export type ChecklistItem = { id: string; texto: string; obligatorio?: boolean };

export type ArchivoConfig = {
    instrucciones: string;
    tiposPermitidos: ('pdf' | 'jpg' | 'png' | 'docx')[];
};

export type EditorHandle = {
    validate: () => boolean;
    getConfig: () => any; // {kind: 'quiz'|'checklist'|'archivo', ...}
};

export function cryptoRandomId() {
    try {
        // @ts-ignore
        const arr = new Uint32Array(1);
        // @ts-ignore
        globalThis.crypto?.getRandomValues?.(arr);
        // @ts-ignore
        return 'id' + (arr[0] || Math.floor(Math.random() * 1e9)).toString(16);
    } catch {
        return 'id' + Math.floor(Math.random() * 1e9).toString(16);
    }
}
