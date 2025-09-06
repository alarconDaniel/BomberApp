// components/reto/utils.ts
import dayjs from 'dayjs';

export const asJson = (body: unknown) => ({
    method: 'POST' as const,
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(body ?? {})
});

export const s10 = (d?: string | null) => (d ?? '').slice(0, 10);
export const nowHHmm = () => dayjs().format('HH:mm');
export const todayYMD = () => dayjs().format('YYYY-MM-DD');
export const humanTitle = (k: string) => k.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/* tipos del reto */
export type Pregunta = {
    codPregunta: number;
    numero: number;
    enunciado: string;
    tipo: 'abcd' | 'rellenar' | 'emparejar' | 'reporte';
    puntos: number;
    tiempoMax: number;
    opciones?: { codOpcion: number; texto: string; correcta: number }[];
    items?: { codItem: number; lado: 'A' | 'B'; contenido: string }[];
    parejas?: { a: number; b: number }[];
    reporte?: { instrucciones: string; tipos: string };
};

export type RetoFull = {
    reto: { codReto: number; nombreReto: string; descripcionReto?: string; tiempoEstimadoSegReto?: number };
    tipoReto: 'quiz' | 'form' | 'checklist' | 'archivo';
    quiz?: { preguntas: Pregunta[] };
    form?: any;
    metadataReto?: any;
};

export type InstanciaUR = {
    codUsuarioReto: number;
    estado: 'asignado' | 'en_progreso' | 'abandonado' | 'completado' | 'vencido';
    fechaObjetivo?: string | null;
    ventanaInicio?: string | null;
    ventanaFin?: string | null;
};

export type ColumnDef = {
    key: string;
    label?: string;
    selectorType?: 'auto'|'brm'|'sino'|'volts'|'ohms'|'brmna'|'ac'|'qty'|'combo'|'text';
    type?: string;
    required?: boolean;
    options?: string[];
    renderBelow?: boolean;
};

export type ItemDef = {
    n: number;
    grupo: string;
    texto: string;
    selector?: 'brm'|'sino'|'volts'|'ohms'|'brmna'|'qty';
    required?: boolean;
    estado?: boolean;
    codigo?: string;
    responsable?: string;
};

export type ItemValor = {
    n: number;
    valor?: string | number | null;
    estado?: 'A'|'C'|null;
    observacion?: string;
    ref?: string;
    solicitud_montaje?: string;
    revision?: string;
    verificacion_jefe?: string;
    nota?: string;
    nota_fecha?: string;
    solicita?: string;
    cantidad?: number | string;
    fecha?: string;
    [key:string]: any;
};

/* forms genéricos */
export type PrimitiveField = {
    type: 'text'|'textarea'|'date'|'number'|'select'|'file';
    label?: string;
    required?: boolean;
    options?: string[];
    accept?: string[];
};
export type ArrayField = {
    type: 'array';
    label?: string;
    item: Record<string, AnyField>;
    required?: boolean;
};
export type AnyField = PrimitiveField | ArrayField | Record<string, any>;

export const setAutoSeedForKey = (k: string, t: PrimitiveField['type'] | 'array') => {
    const key = k.toLowerCase();
    if (t === 'date' || key.includes('fecha')) return todayYMD();
    if (key.includes('hora')) return nowHHmm();
    return '';
};

export const initGenericValues = (schemaObj: Record<string, AnyField>) => {
    const out: any = {};
    for (const [k, def] of Object.entries(schemaObj || {})) {
        if (def && typeof def === 'object' && 'type' in def) {
            const t = (def as any).type as PrimitiveField['type'] | 'array';
            if (t === 'array') out[k] = [];
            else out[k] = setAutoSeedForKey(k, t as any);
        } else if (def && typeof def === 'object') {
            out[k] = initGenericValues(def as any);
        }
    }
    return out;
};

export const validateGeneric = (schemaObj: Record<string, AnyField>, values: any, path: string[] = []): string[] => {
    const falt: string[] = [];
    for (const [k, def] of Object.entries(schemaObj || {})) {
        const val = values?.[k];
        const trail = [...path, k];
        if (def && typeof def === 'object' && 'type' in def) {
            const t = (def as any).type as PrimitiveField['type'] | 'array';
            const req = !!(def as any).required;
            if (t === 'array') {
                if (req && (!Array.isArray(val) || val.length === 0)) {
                    falt.push(trail.join(' > ') + ' (lista vacía)');
                } else {
                    const itemDef = (def as ArrayField).item || {};
                    (val || []).forEach((row: any, idx: number) => {
                        const subFalt = validateGeneric(itemDef as any, row, [...trail, `#${idx + 1}`]);
                        falt.push(...subFalt);
                    });
                }
            } else {
                const isFinalSeal = k.toLowerCase().includes('final');
                const v = (val ?? '').toString().trim();
                if (req && !v && !isFinalSeal) falt.push(trail.join(' > '));
            }
        } else if (def && typeof def === 'object') {
            const subFalt = validateGeneric(def as any, val, trail);
            falt.push(...subFalt);
        }
    }
    return falt;
};

export const isGroupedChecklist = (meta: any): boolean => {
    const items = meta?.schema?.items;
    if (!Array.isArray(items)) return false;
    return items.every((x: any) => x && typeof x === 'object' && Number.isFinite(+x.n) && !!x.grupo && !!x.texto);
};

export const getColumns = (meta: any): ColumnDef[] => {
    const cols: ColumnDef[] = Array.isArray(meta?.schema?.columns)
        ? meta.schema.columns
        : [
            {key:'n', label:'Item'},
            {key:'valor', label:'Seleccione', selectorType:'auto'},
            {key:'observacion', label:'Observación'}
        ];
    const hasN = cols.some(c => c.key === 'n');
    const hasObs = cols.some(c => c.key === 'observacion');
    const out: ColumnDef[] = [];
    if (!hasN) out.push({key:'n', label:'Item'});
    for (const c of cols) out.push(c);
    if (!hasObs) out.push({key:'observacion', label:'Observación'});
    return out;
};
