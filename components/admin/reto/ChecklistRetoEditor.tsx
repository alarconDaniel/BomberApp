// components/admin/reto/ChecklistRetoEditor.tsx
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet, ScrollView, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';
import { EditorHandle, cryptoRandomId } from './types';

/** ====== Tipos de esquema que renderizan FormRetoExact / ChecklistReto ======
 * metadataReto = {
 *   kind: string, // p.ej. "tg_checklist_v1" | "acta_visita_v1" | "relacion_entrega_bomba_v1" | "checklist"
 *   schema: {
 *     header?: Record<string, PrimitiveField>
 *     columns?: ColumnDef[]                              // global
 *     columnsByGroup?: Record<string, ColumnDef[]>       // override por grupo
 *     items?: ItemDef[]                                  // lista con (n, grupo, texto, selector?, required?, responsable?, codigo?)
 *     firmas?: Record<string, { title?: string, fields: Record<string, PrimitiveField> }>
 *   },
 *   ui?: { hideItemNumber?: boolean, allowDraft?: boolean, autoSave?: boolean, noteBeforeAccessories?: string, pdfLayoutHint?: string }
 * }
 */

type PrimitiveType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'file';
type SelectorType = 'auto' | 'brm' | 'brmna' | 'sino' | 'volts' | 'ohms' | 'qty' | 'combo';

type PrimitiveField = {
    type: PrimitiveType;
    label?: string;
    required?: boolean;
    options?: string[];  // para select
    accept?: string[];   // para file
};

type ColumnDef = {
    key: string;                 // 'n' | 'valor' | 'estado' | 'observacion' | extra
    label?: string;
    type?: 'textarea';           // solo si es observacion textarea
    selectorType?: SelectorType; // para 'valor' u otras columnas con selector
    options?: string[];          // para combo
    required?: boolean;
};

type ItemDef = {
    n: number;
    grupo: string;
    texto: string;
    selector?: SelectorType;       // usado cuando columns.valor.selectorType === 'auto'
    required?: boolean;
    responsable?: string;
    codigo?: string;               // algunos formatos lo usan
    estado?: boolean;              // fuerza columna estado requerida (A/C)
};

export type ChecklistEditorProps = {
    colors: any;
    g: ReturnType<typeof makeGlobalStyles>;
    initialConfig?: any; // { kind, schema, ui }
};

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: 'n', label: 'Item' },
    { key: 'valor', label: 'Seleccione', selectorType: 'auto', required: false },
    { key: 'observacion', label: 'Observación', type: 'textarea' },
];

const selectorLabels: Record<SelectorType, string> = {
    auto: 'Auto por ítem',
    brm: 'B/R/M',
    brmna: 'B/R/M/NA',
    sino: 'Sí/No',
    volts: 'Volts',
    ohms: 'Ohms',
    qty: 'Cantidad',
    combo: 'Combo (opciones)',
};

function humanTitle(s: string) {
    return s
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

const ChecklistRetoEditor = forwardRef<EditorHandle, ChecklistEditorProps>(
    ({ colors, g, initialConfig }, ref) => {
        // ===== estilos
        const s = useMemo(
            () =>
                StyleSheet.create({
                    input: {
                        borderWidth: 1,
                        borderColor: colors.inputBorder,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        height: 40,
                        backgroundColor: colors.card,
                        color: colors.text,
                    },
                    area: {
                        borderWidth: 1,
                        borderColor: colors.inputBorder,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        minHeight: 80,
                        backgroundColor: colors.card,
                        color: colors.text,
                        textAlignVertical: 'top',
                    },
                    chip: {
                        paddingHorizontal: 10,
                        height: 32,
                        borderRadius: 999,
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: colors.outline,
                        backgroundColor: colors.mutedBg,
                    },
                    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
                    smallBtn: {
                        height: 32,
                        paddingHorizontal: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.outline,
                        backgroundColor: colors.mutedBg,
                        alignItems: 'center',
                        justifyContent: 'center',
                    },
                    smallDanger: {
                        height: 32,
                        width: 32,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.outline,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',         // 👈 evita desborde
                    },
                    section: { marginTop: 16, padding: 12, borderWidth: 1, borderColor: colors.divider, borderRadius: 12, backgroundColor: colors.card },
                    pill: {
                        alignSelf: 'flex-start' as const,
                        paddingHorizontal: 12,
                        height: 36,
                        borderRadius: 10,
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: colors.outline,
                        backgroundColor: colors.mutedBg,
                    },
                    divider: { height: 1, backgroundColor: colors.divider, marginVertical: 10 },
                }),
            [colors]
        );

        // ===== estado base (inyecta initialConfig preservando kind/ui)
        const [kind, setKind] = useState<string>(() => {
            const k = initialConfig?.kind;
            return typeof k === 'string' && k.trim() ? k : 'checklist';
        });

        // schema pieces
        const [header, setHeader] = useState<Record<string, PrimitiveField>>({});
        const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
        const [columnsByGroup, setColumnsByGroup] = useState<Record<string, ColumnDef[]>>({});
        const [items, setItems] = useState<ItemDef[]>([]);
        const [firmas, setFirmas] = useState<Record<string, { title?: string; fields: Record<string, PrimitiveField> }>>({});
        const [ui, setUi] = useState<{ hideItemNumber?: boolean; allowDraft?: boolean; autoSave?: boolean; noteBeforeAccessories?: string; pdfLayoutHint?: string }>({});

        // ===== hydrate initialConfig
        useEffect(() => {
            if (!initialConfig) return;
            const cfg = typeof initialConfig === 'string' ? safeParse(initialConfig) : initialConfig;
            const sc = cfg?.schema ?? {};
            setKind(String(cfg?.kind ?? kind));

            // — soportar alias "encabezado"
            const incomingHeader = sc?.header ?? sc?.encabezado ?? {};
            setHeader(incomingHeader);

// — columns / columnsByGroup igual
            setColumns(Array.isArray(sc?.columns) && sc.columns.length ? sc.columns : DEFAULT_COLUMNS);
            setColumnsByGroup(sc?.columnsByGroup ?? {});

// — items igual
            setItems(Array.isArray(sc?.items) ? normalizeItems(sc.items) : []);

// — firmas: usar las nativas o mapear "aceptacion" → un bloque
            let incomingFirmas = sc?.firmas ?? {};
            if ((!incomingFirmas || Object.keys(incomingFirmas).length === 0) && sc?.aceptacion && typeof sc.aceptacion === 'object') {
                incomingFirmas = {
                    aceptacion: {
                        title: 'Aceptación',
                        fields: Object.fromEntries(
                            Object.entries(sc.aceptacion as Record<string, any>).map(([k, v]) => [
                                k,
                                cleanPrimitiveField(v, k), // ya existe abajo
                            ])
                        ),
                    },
                };
            }
            setFirmas(incomingFirmas);

// — ui igual
            setUi(cfg?.ui ?? {});

        }, [initialConfig]);

        function safeParse(s: string) {
            try {
                return JSON.parse(s);
            } catch {
                return null;
            }
        }

        function normalizeItems(arr: any[]): ItemDef[] {
            // Asegura 'n' incremental si falta
            const out: ItemDef[] = [];
            let max = 0;
            for (const raw of arr) {
                const n = Number(raw?.n) || (max + 1);
                max = Math.max(max, n);
                out.push({
                    n,
                    grupo: String(raw?.grupo ?? '').trim() || 'General',
                    texto: String(raw?.texto ?? '').trim(),
                    selector: (raw?.selector || 'brm') as SelectorType,
                    required: !!raw?.required,
                    responsable: raw?.responsable ? String(raw.responsable) : undefined,
                    codigo: raw?.codigo ? String(raw.codigo) : undefined,
                    estado: raw?.estado === true ? true : undefined,
                });
            }
            // Ordenar por n
            out.sort((a, b) => a.n - b.n);
            // Reasignar n consecutivo (evita huecos)
            return out.map((x, i) => ({ ...x, n: i + 1 }));
        }

        // ===== helpers UI
        const toggle = (v: boolean, set: (x: boolean) => void) => () => set(!v);

        const addHeaderField = () => {
            const key = suggestNewKey(Object.keys(header), 'campo');
            setHeader((prev) => ({
                ...prev,
                [key]: { type: 'text', label: humanTitle(key), required: false },
            }));
        };

        const addItem = (grupo?: string) => {
            setItems((prev) => {
                const n = prev.length + 1;
                return [
                    ...prev,
                    {
                        n,
                        grupo: (grupo || '').trim() || 'General',
                        texto: '',
                        selector: 'brm',
                        required: true,
                    },
                ];
            });
        };

        const addGroupIfMissing = (name: string) => {
            if (!name.trim()) return;
            setColumnsByGroup((prev) => {
                if (prev[name]) return prev;
                return { ...prev, [name]: DEFAULT_COLUMNS };
            });
        };

        const removeGroupOverride = (name: string) => {
            setColumnsByGroup((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        };

        const addFirmaBlock = () => {
            const key = suggestNewKey(Object.keys(firmas), 'bloque');
            setFirmas((prev) => ({ ...prev, [key]: { title: humanTitle(key), fields: {} } }));
        };

        const addFirmaField = (bloqueKey: string) => {
            setFirmas((prev) => {
                // Estructura tipada del bloque
                type FirmaBlock = { title?: string; fields: Record<string, PrimitiveField> };

                const prevBlock: FirmaBlock = prev[bloqueKey] ?? { title: undefined, fields: {} as Record<string, PrimitiveField> };

                const fkey = suggestNewKey(Object.keys(prevBlock.fields), 'campo');

                // Asegura que el literal es un PrimitiveField (no se ensancha a string)
                const newField: PrimitiveField = { type: 'text', label: humanTitle(fkey), required: false };

                // Reconstituye con tipos cerrados
                const nextFields: Record<string, PrimitiveField> = { ...prevBlock.fields, [fkey]: newField };

                const nextBlock: FirmaBlock = { ...prevBlock, fields: nextFields };

                // Retorna exactamente el mismo shape que el estado
                return { ...prev, [bloqueKey]: nextBlock };
            });
        };


        const selectorOptionsHint = (sel?: SelectorType) => (sel === 'combo' ? 'op1|op2|op3' : '');

        function suggestNewKey(existing: string[], base: string) {
            let i = 1;
            while (existing.includes(`${base}${i}`)) i++;
            return `${base}${i}`;
        }

        // ===== VALIDACIÓN + SALIDA
        useImperativeHandle(
            ref,
            () => ({
                validate() {
                    // Regla mínima: al menos 1 ítem con texto y grupo
                    const filled = items.filter((it) => it.texto.trim()).length;
                    if (!filled) {
                        Alert.alert('Faltan ítems', 'Debes agregar al menos un ítem con texto.');
                        return false;
                    }

                    // Reglas de columnas: deben contener siempre 'n'. Si tienen 'valor' con selectorType 'combo', exigir options
                    const colsToCheck = [columns, ...Object.values(columnsByGroup || {})];
                    for (const colset of colsToCheck) {
                        const keys = new Set(colset.map((c) => c.key));
                        if (!keys.has('n')) {
                            Alert.alert('Columnas inválidas', 'En todas las tablas debe existir la columna "n".');
                            return false;
                        }
                        const val = colset.find((c) => c.key === 'valor');
                        if (val?.selectorType === 'combo' && (!val.options || !val.options.length)) {
                            Alert.alert('Opciones faltantes', 'Cuando "valor" es combo, debes definir sus opciones.');
                            return false;
                        }
                    }

                    // Firmas: si hay bloques, sus fields deben tener etiqueta y tipo
                    for (const [bk, bcfg] of Object.entries(firmas || {})) {
                        if (!bcfg || typeof bcfg !== 'object') continue;
                        const fields = bcfg.fields || {};
                        for (const [fk, fdef] of Object.entries(fields)) {
                            if (!fdef?.type) {
                                Alert.alert('Firmas incompletas', `El campo "${fk}" del bloque "${bcfg.title || bk}" no tiene tipo.`);
                                return false;
                            }
                        }
                    }

                    return true;
                },
                getConfig() {
                    // Limpia y empaqueta
                    const cleanHeader = Object.fromEntries(
                        Object.entries(header || {}).map(([k, f]) => [
                            k,
                            {
                                type: (f?.type || 'text') as PrimitiveType,
                                label: f?.label?.trim() || humanTitle(k),
                                required: !!f?.required,
                                ...(f?.options?.length ? { options: f.options } : {}),
                                ...(f?.accept?.length ? { accept: f.accept } : {}),
                            },
                        ])
                    );

                    const cleanItems = items
                        .map((x, i) => ({
                            n: i + 1,
                            grupo: x.grupo.trim() || 'General',
                            texto: x.texto.trim(),
                            selector: (x.selector || 'brm') as SelectorType,
                            required: !!x.required,
                            ...(x.responsable ? { responsable: String(x.responsable) } : {}),
                            ...(x.codigo ? { codigo: String(x.codigo) } : {}),
                            ...(x.estado ? { estado: true } : {}),
                        }))
                        .filter((x) => x.texto);

                    const cleanColumns = normalizeColumns(columns);
                    const cleanColumnsByGroup = Object.fromEntries(
                        Object.entries(columnsByGroup || {}).map(([gk, arr]) => [gk, normalizeColumns(arr)])
                    );

                    const cleanFirmas = Object.fromEntries(
                        Object.entries(firmas || {}).map(([bk, bcfg]) => [
                            bk,
                            {
                                ...(bcfg?.title ? { title: String(bcfg.title) } : {}),
                                fields: Object.fromEntries(
                                    Object.entries(bcfg?.fields || {}).map(([fk, fdef]: any) => [
                                        fk,
                                        cleanPrimitiveField(fdef, fk),
                                    ])
                                ),
                            },
                        ])
                    );

                    const out = {
                        kind,
                        schema: {
                            ...(Object.keys(cleanHeader).length ? { header: cleanHeader } : {}),
                            ...(Object.keys(cleanColumnsByGroup).length ? { columnsByGroup: cleanColumnsByGroup } : { columns: cleanColumns }),
                            items: cleanItems,
                            ...(Object.keys(cleanFirmas).length ? { firmas: cleanFirmas } : {}),
                        },
                        ui: {
                            ...(ui?.hideItemNumber ? { hideItemNumber: true } : {}),
                            ...(ui?.allowDraft ? { allowDraft: true } : {}),
                            ...(ui?.autoSave ? { autoSave: true } : {}),
                            ...(ui?.noteBeforeAccessories ? { noteBeforeAccessories: ui.noteBeforeAccessories } : {}),
                            ...(ui?.pdfLayoutHint ? { pdfLayoutHint: ui.pdfLayoutHint } : {}),
                        },
                    };
                    return out;
                },
            }),
            [header, columns, columnsByGroup, items, firmas, ui, kind]
        );

        function cleanPrimitiveField(f: any, keyForLabel: string): PrimitiveField {
            const type = (f?.type || 'text') as PrimitiveType;
            const base: PrimitiveField = {
                type,
                label: f?.label?.trim() || humanTitle(keyForLabel),
                required: !!f?.required,
            };
            if (type === 'select' && Array.isArray(f?.options)) base.options = f.options.map(String);
            if (type === 'file' && Array.isArray(f?.accept)) base.accept = f.accept.map(String);
            return base;
        }

        function normalizeColumns(arr: ColumnDef[]): ColumnDef[] {
            // Garantiza que 'n' exista y va primero
            const map = new Map<string, ColumnDef>();
            for (const c of arr || []) {
                if (!c?.key) continue;
                map.set(c.key, {
                    key: String(c.key),
                    ...(c?.label ? { label: String(c.label) } : {}),
                    ...(c?.type ? { type: c.type } : {}),
                    ...(c?.selectorType ? { selectorType: c.selectorType } : {}),
                    ...(Array.isArray(c?.options) && c.options.length ? { options: c.options.map(String) } : {}),
                    ...(c?.required ? { required: true } : {}),
                });
            }
            if (!map.has('n')) map.set('n', { key: 'n', label: 'Item' });
            // orden recomendado
            const order = ['n', 'valor'];
            const all = Array.from(map.values());
            all.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
            return all;
        }

        // ======= RENDER =======
        const groupNames = Array.from(new Set(items.map((i) => i.grupo))).filter(Boolean).sort();

        return (
            <View>
                {/* KIND + UI */}
                <View style={[s.section]}>
                    <Text style={g.text.smallStrong}>Identificador del formato (kind)</Text>
                    <TextInput
                        value={kind}
                        onChangeText={setKind}
                        placeholder="p.ej. tg_checklist_v1"
                        placeholderTextColor={colors.mutedText}
                        style={[s.input, { marginTop: 6 }]}
                    />

                    <View style={[s.divider]} />

                    <Text style={g.text.smallStrong}>Preferencias de UI</Text>
                    <View style={{ marginTop: 6, gap: 8 }}>
                        <ToggleRow label="Ocultar número de ítem" value={!!ui.hideItemNumber} onToggle={() => setUi((p) => ({ ...p, hideItemNumber: !p.hideItemNumber }))} />
                        <ToggleRow label="Permitir borradores (allowDraft)" value={!!ui.allowDraft} onToggle={() => setUi((p) => ({ ...p, allowDraft: !p.allowDraft }))} />
                        <ToggleRow label="Auto guardado (autoSave)" value={!!ui.autoSave} onToggle={() => setUi((p) => ({ ...p, autoSave: !p.autoSave }))} />
                    </View>

                    <Text style={[g.text.smallStrong, { marginTop: 10 }]}>Nota informativa (opcional)</Text>
                    <TextInput
                        value={ui.noteBeforeAccessories || ''}
                        onChangeText={(t) => setUi((p) => ({ ...p, noteBeforeAccessories: t }))}
                        placeholder="Nota previa a una sección (si aplica)"
                        placeholderTextColor={colors.mutedText}
                        style={[s.area, { marginTop: 6 }]}
                        multiline
                    />

                    <Text style={[g.text.smallStrong, { marginTop: 10 }]}>Pista de layout PDF (opcional)</Text>
                    <TextInput
                        value={ui.pdfLayoutHint || ''}
                        onChangeText={(t) => setUi((p) => ({ ...p, pdfLayoutHint: t }))}
                        placeholder="p.ej. basado en PRE-FR-020 hoja 1"
                        placeholderTextColor={colors.mutedText}
                        style={[s.input, { marginTop: 6 }]}
                    />
                </View>

                {/* HEADER */}
                <View style={[s.section]}>
                    <Text style={g.text.h3}>Encabezado</Text>
                    <Pressable onPress={addHeaderField} style={[s.pill, { marginTop: 8 }]}><Text style={g.text.bodyStrong}>+ Añadir campo</Text></Pressable>

                    {Object.entries(header).map(([key, f]) => (
                        <View key={key} style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: colors.divider, borderRadius: 10 }}>
                            <View style={s.row}>
                                <Text style={g.text.smallStrong}>Clave</Text>
                                <View style={{ flex: 1 }} />
                                <Pressable onPress={() => {
                                    const next = { ...header }; delete next[key]; setHeader(next);
                                }} style={[s.smallDanger]}>
                                    <Ionicons name="trash" size={16} color={colors.danger} />
                                </Pressable>
                            </View>
                            <View style={{ marginTop: 6, gap: 8 }}>
                                <TextInput value={key} editable={false} style={[s.input]} />
                                <RowLabelValue label="Etiqueta" value={f.label ?? ''} onChange={(t) => setHeader((p) => ({ ...p, [key]: { ...f, label: t } }))} s={s} colors={colors} />
                                <RowSelect
                                    label="Tipo"
                                    value={f.type || 'text'}
                                    options={['text', 'textarea', 'number', 'date', 'select', 'file']}
                                    onChange={(val) => setHeader((p) => ({ ...p, [key]: { ...f, type: val as PrimitiveType, ...(val !== 'select' ? { options: undefined } : {}), ...(val !== 'file' ? { accept: undefined } : {}) } }))}
                                    s={s}
                                    colors={colors}
                                />
                                {f.type === 'select' && (
                                    <RowLabelValue
                                        label="Opciones (separadas por |)"
                                        value={(f.options || []).join(' | ')}
                                        onChange={(t) => setHeader((p) => ({ ...p, [key]: { ...f, options: splitOptions(t) } }))}
                                        s={s}
                                        colors={colors}
                                        placeholder="op1 | op2 | op3"
                                    />
                                )}
                                {f.type === 'file' && (
                                    <RowLabelValue
                                        label="Tipos permitidos (separados por |)"
                                        value={(f.accept || []).join(' | ')}
                                        onChange={(t) => setHeader((p) => ({ ...p, [key]: { ...f, accept: splitOptions(t) } }))}
                                        s={s}
                                        colors={colors}
                                        placeholder="jpg | png | pdf"
                                    />
                                )}
                                <ToggleRow
                                    label="Requerido"
                                    value={!!f.required}
                                    onToggle={() => setHeader((p) => ({ ...p, [key]: { ...f, required: !f.required } }))}
                                />
                            </View>
                        </View>
                    ))}
                </View>

                {/* COLUMNS (global) */}
                <View style={[s.section]}>
                    <Text style={g.text.h3}>Columnas globales</Text>
                    <Text style={[g.text.caption, { marginTop: 4 }]}>Estas aplican a todos los grupos salvo que agregues overrides en “Columnas por grupo”.</Text>

                    <ColumnsEditor
                        colors={colors}
                        g={g}
                        columns={columns}
                        onChange={setColumns}
                    />
                </View>

                {/* COLUMNS BY GROUP */}
                <View style={[s.section]}>
                    <Text style={g.text.h3}>Columnas por grupo (override)</Text>
                    <Text style={[g.text.caption, { marginTop: 4 }]}>Si un grupo aparece aquí, usará sus propias columnas.</Text>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {groupNames.map((gn) => (
                            <Pressable key={gn} onPress={() => addGroupIfMissing(gn)} style={s.chip}>
                                <Text style={g.text.caption}>+ {gn}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {Object.keys(columnsByGroup).length === 0 && (
                        <Text style={[g.text.caption, { marginTop: 6, color: colors.mutedText }]}>Aún no hay overrides. Toca un grupo arriba para crearlo.</Text>
                    )}

                    {Object.entries(columnsByGroup).map(([gname, cols]) => (
                        <View key={gname} style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: colors.divider, borderRadius: 10 }}>
                            <View style={s.row}>
                                <Text style={g.text.smallStrong}>{gname}</Text>
                                <View style={{ flex: 1 }} />
                                <Pressable onPress={() => removeGroupOverride(gname)} style={[s.smallDanger]}>
                                    <Ionicons name="trash" size={16} color={colors.danger} />
                                </Pressable>
                            </View>
                            <ColumnsEditor
                                colors={colors}
                                g={g}
                                columns={Array.isArray(cols) ? cols : (cols as any)?.columns || []}  // 👈 adaptación
                                onChange={(next) =>
                                    setColumnsByGroup((p) => {
                                        const wasObj = !Array.isArray(p[gname]) && p[gname] && (p[gname] as any).columns;
                                        return {
                                            ...p,
                                            [gname]: wasObj ? { ...(p[gname] as any), columns: next } : next, // 👈 preservar layout si existía
                                        };
                                    })
                                }
                            />
                        </View>
                    ))}
                </View>

                {/* ITEMS */}
                <View style={[s.section]}>
                    <Text style={g.text.h3}>Ítems (filas)</Text>
                    <Pressable onPress={() => addItem('General')} style={[s.pill, { marginTop: 8 }]}>
                        <Text style={g.text.bodyStrong}>+ Añadir ítem</Text>
                    </Pressable>

                    {items.length === 0 && (
                        <Text style={[g.text.caption, { marginTop: 8, color: colors.mutedText }]}>
                            Agrega ítems; cada uno aparece como una fila dentro del grupo que definas. Igualito a cómo se responde.
                        </Text>
                    )}

                    {items.map((it, idx) => (
                        <View key={it.n} style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: colors.divider, borderRadius: 10 }}>
                            <View style={s.row}>
                                <Text style={g.text.smallStrong}>#{it.n}</Text>
                                <View style={{ flex: 1 }} />
                                <Pressable
                                    onPress={() =>
                                        setItems((prev) => {
                                            const next = prev.filter((x) => x.n !== it.n).map((x, i) => ({ ...x, n: i + 1 }));
                                            return next;
                                        })
                                    }
                                    style={s.smallDanger}
                                >
                                    <Ionicons name="trash" size={16} color={colors.danger} />
                                </Pressable>
                            </View>

                            <RowLabelValue
                                label="Grupo"
                                value={it.grupo}
                                onChange={(t) => setItems((prev) => prev.map((x) => (x.n === it.n ? { ...x, grupo: t } : x)))}
                                s={s}
                                colors={colors}
                                placeholder="p.ej. Base Grúa / Cabina / Accesorios…"
                            />

                            <RowLabelValue
                                label="Texto del ítem"
                                value={it.texto}
                                onChange={(t) => setItems((prev) => prev.map((x) => (x.n === it.n ? { ...x, texto: t } : x)))}
                                s={s}
                                colors={colors}
                                placeholder="¿Qué se inspecciona / mide / verifica?"
                            />

                            <RowSelect
                                label='Selector del "valor"'
                                value={it.selector || 'brm'}
                                options={['brm', 'brmna', 'sino', 'volts', 'ohms', 'qty', 'combo', 'auto']}
                                onChange={(val) => setItems((prev) => prev.map((x) => (x.n === it.n ? { ...x, selector: val as SelectorType } : x)))}
                                s={s}
                                colors={colors}
                                help={`Aparecerá si la columna "valor" usa selectorType=auto. ${selectorLabels[it.selector || 'brm']}`}
                            />

                            <RowLabelValue
                                label="Responsable (opcional)"
                                value={it.responsable || ''}
                                onChange={(t) => setItems((prev) => prev.map((x) => (x.n === it.n ? { ...x, responsable: t || undefined } : x)))}
                                s={s}
                                colors={colors}
                                placeholder="Si aplica"
                            />

                            <RowLabelValue
                                label="Código (opcional)"
                                value={it.codigo || ''}
                                onChange={(t) => setItems((prev) => prev.map((x) => (x.n === it.n ? { ...x, codigo: t || undefined } : x)))}
                                s={s}
                                colors={colors}
                                placeholder="SKU / referencia…"
                            />

                            <View style={{ marginTop: 6 }}>
                                <ToggleRow
                                    label="Requerido"
                                    value={!!it.required}
                                    onToggle={() => setItems((prev) => prev.map((x) => (x.n === it.n ? { ...x, required: !x.required } : x)))}
                                />
                                <ToggleRow
                                    label='Forzar columna "Estado (A/C)" requerida'
                                    value={!!it.estado}
                                    onToggle={() => setItems((prev) => prev.map((x) => (x.n === it.n ? { ...x, estado: !x.estado } : x)))}
                                />
                            </View>
                        </View>
                    ))}
                </View>

                {/* FIRMAS */}
                <View style={[s.section]}>
                    <Text style={g.text.h3}>Firmas / Bloques finales</Text>
                    <Pressable onPress={addFirmaBlock} style={[s.pill, { marginTop: 8 }]}><Text style={g.text.bodyStrong}>+ Añadir bloque</Text></Pressable>

                    {Object.keys(firmas).length === 0 && (
                        <Text style={[g.text.caption, { marginTop: 8, color: colors.mutedText }]}>
                            Si tu formato requiere firmas o datos finales, crea bloques aquí.
                        </Text>
                    )}

                    {Object.entries(firmas).map(([bk, bcfg]) => (
                        <View key={bk} style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: colors.divider, borderRadius: 10 }}>
                            <View style={s.row}>
                                <Text style={g.text.smallStrong}>{bcfg?.title || humanTitle(bk)}</Text>
                                <View style={{ flex: 1 }} />
                                <Pressable onPress={() => {
                                    const next = { ...firmas }; delete next[bk]; setFirmas(next);
                                }} style={s.smallDanger}>
                                    <Ionicons name="trash" size={16} color={colors.danger} />
                                </Pressable>
                            </View>

                            <RowLabelValue
                                label="Título visible"
                                value={bcfg?.title || ''}
                                onChange={(t) => setFirmas((prev) => ({ ...prev, [bk]: { ...(prev[bk] || {}), title: t } }))}
                                s={s}
                                colors={colors}
                            />

                            <Pressable onPress={() => addFirmaField(bk)} style={[s.pill, { marginTop: 8 }]}>
                                <Text style={g.text.bodyStrong}>+ Añadir campo</Text>
                            </Pressable>

                            {Object.entries(bcfg?.fields || {}).map(([fk, fdef]) => (
                                <View key={`${bk}:${fk}`} style={{ marginTop: 8, padding: 8, borderWidth: 1, borderColor: colors.divider, borderRadius: 10 }}>
                                    <View style={s.row}>
                                        <Text style={g.text.smallStrong}>{fk}</Text>
                                        <View style={{ flex: 1 }} />
                                        <Pressable onPress={() => {
                                            const fields = { ...(firmas[bk]?.fields || {}) };
                                            delete fields[fk];
                                            setFirmas((prev) => ({ ...prev, [bk]: { ...(prev[bk] || {}), fields } }));
                                        }} style={s.smallDanger}>
                                            <Ionicons name="trash" size={16} color={colors.danger} />
                                        </Pressable>
                                    </View>
                                    <RowLabelValue
                                        label="Etiqueta"
                                        value={fdef?.label || ''}
                                        onChange={(t) =>
                                            setFirmas((prev) => ({
                                                ...prev,
                                                [bk]: { ...(prev[bk] || {}), fields: { ...(prev[bk]?.fields || {}), [fk]: { ...(fdef || {}), label: t } } },
                                            }))
                                        }
                                        s={s}
                                        colors={colors}
                                    />
                                    <RowSelect
                                        label="Tipo"
                                        value={fdef?.type || 'text'}
                                        options={['text', 'textarea', 'number', 'date', 'file']}
                                        onChange={(val) =>
                                            setFirmas((prev) => ({
                                                ...prev,
                                                [bk]: {
                                                    ...(prev[bk] || {}),
                                                    fields: {
                                                        ...(prev[bk]?.fields || {}),
                                                        [fk]: {
                                                            ...(fdef || {}),
                                                            type: val as PrimitiveType,
                                                            ...(val !== 'file' ? { accept: undefined } : {}),
                                                        },
                                                    },
                                                },
                                            }))
                                        }
                                        s={s}
                                        colors={colors}
                                    />
                                    {fdef?.type === 'file' && (
                                        <RowLabelValue
                                            label="Tipos permitidos (|)"
                                            value={(fdef?.accept || []).join(' | ')}
                                            onChange={(t) =>
                                                setFirmas((prev) => ({
                                                    ...prev,
                                                    [bk]: {
                                                        ...(prev[bk] || {}),
                                                        fields: { ...(prev[bk]?.fields || {}), [fk]: { ...(fdef || {}), accept: splitOptions(t) } },
                                                    },
                                                }))
                                            }
                                            s={s}
                                            colors={colors}
                                            placeholder="jpg | png"
                                        />
                                    )}
                                    <ToggleRow
                                        label="Requerido"
                                        value={!!fdef?.required}
                                        onToggle={() =>
                                            setFirmas((prev) => ({
                                                ...prev,
                                                [bk]: {
                                                    ...(prev[bk] || {}),
                                                    fields: { ...(prev[bk]?.fields || {}), [fk]: { ...(fdef || {}), required: !fdef?.required } },
                                                },
                                            }))
                                        }
                                    />
                                </View>
                            ))}
                        </View>
                    ))}
                </View>

                {/* nota nerd para labubus: si llegaste hasta aquí, mereces un Zenless ☕ */}
            </View>
        );
    }
);

// —— Subcomponentes helpers ——
function RowLabelValue({
                           label,
                           value,
                           onChange,
                           s,
                           colors,
                           placeholder,
                       }: {
    label: string;
    value: string;
    onChange: (t: string) => void;
    s: any;
    colors: any;
    placeholder?: string;
}) {
    return (
        <View style={{ marginTop: 6 }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={onChange}
                placeholder={placeholder || label}
                placeholderTextColor={colors.mutedText}
                style={[s.input, { marginTop: 6 }]}
            />
        </View>
    );
}

function RowSelect({
                       label,
                       value,
                       options,
                       onChange,
                       s,
                       colors,
                       help,
                   }: {
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
    s: any;
    colors: any;
    help?: string;
}) {
    return (
        <View style={{ marginTop: 6 }}>
            <Text style={{ fontWeight: '700', color: colors.text }}>{label}</Text>
            <TextInput
                value={value}
                onChangeText={(t) => onChange(t.trim())}
                placeholder={options.join(' | ')}
                placeholderTextColor={colors.mutedText}
                style={[s.input, { marginTop: 6 }]}
            />
            {!!help && <Text style={{ color: colors.mutedText, marginTop: 4, fontSize: 12 }}>{help}</Text>}
        </View>
    );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
    return (
        <Pressable onPress={onToggle} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 32, marginTop: 6 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#999', alignItems: 'center', justifyContent: 'center' }}>
                {value ? <Ionicons name="checkmark" size={16} color="#0d6efd" /> : null}
            </View>
            <Text>{label}</Text>
        </Pressable>
    );
}

function splitOptions(t: string): string[] {
    return t
        .split('|')
        .map((x) => x.trim())
        .filter(Boolean);
}

function ColumnsEditor({
                           colors,
                           g,
                           columns,
                           onChange,
                       }: {
    colors: any;
    g: ReturnType<typeof makeGlobalStyles>;
    columns: ColumnDef[] | any; // puede venir como array o { columns, layout }
    onChange: (cols: ColumnDef[]) => void;
}) {
    // Patch B: normalizar la prop para que siempre trabajemos con un array
    const normalized: ColumnDef[] = Array.isArray(columns)
        ? columns
        : (columns as any)?.columns || [];

    const s = useMemo(
        () =>
            StyleSheet.create({
                input: {
                    borderWidth: 1,
                    borderColor: colors.inputBorder,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 40,
                    backgroundColor: colors.card,
                    color: colors.text,
                },
                smallBtn: {
                    height: 32,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.outline,
                    backgroundColor: colors.mutedBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                smallDanger: {
                    height: 32,
                    width: 32,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.outline,
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden', // evita desborde del ícono
                },
            }),
        [colors]
    );

    // Helpers que siempre operan sobre "normalized"
    const addCol = () => {
        const next = [
            ...normalized,
            { key: suggest(['col', 'extra', 'campo'], normalized), label: '', selectorType: undefined } as any,
        ];
        onChange(next);
    };

    const update = (idx: number, patch: Partial<ColumnDef>) => {
        const next = [...normalized];
        next[idx] = { ...next[idx], ...patch };
        onChange(next);
    };

    const remove = (idx: number) => {
        const target = normalized[idx];
        if (target?.key === 'n') {
            Alert.alert('No permitido', 'La columna "n" es obligatoria.');
            return;
        }
        const next = [...normalized];
        next.splice(idx, 1);
        onChange(next);
    };

    return (
        <View style={{ marginTop: 8 }}>
            <Pressable
                onPress={addCol}
                style={{
                    alignSelf: 'flex-start',
                    paddingHorizontal: 12,
                    height: 36,
                    borderRadius: 10,
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: colors.outline,
                    backgroundColor: colors.mutedBg,
                }}
            >
                <Text style={g.text.bodyStrong}>+ Añadir columna</Text>
            </Pressable>

            {normalized.map((c, idx) => (
                <View key={idx} style={{ marginTop: 8, padding: 10, borderWidth: 1, borderColor: colors.divider, borderRadius: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={g.text.smallStrong}>key</Text>
                            <TextInput
                                value={c.key}
                                onChangeText={(t) => update(idx, { key: t.trim() })}
                                placeholder="n | valor | estado | observacion | otra"
                                placeholderTextColor={colors.mutedText}
                                style={[s.input, { marginTop: 6 }]}
                            />
                        </View>
                        <Pressable onPress={() => remove(idx)} style={s.smallDanger}>
                            <Ionicons name="trash" size={16} color={colors.danger} />
                        </Pressable>
                    </View>

                    <View style={{ marginTop: 6 }}>
                        <Text style={g.text.smallStrong}>Etiqueta</Text>
                        <TextInput
                            value={c.label || ''}
                            onChangeText={(t) => update(idx, { label: t })}
                            placeholder="Etiqueta visible"
                            placeholderTextColor={colors.mutedText}
                            style={[s.input, { marginTop: 6 }]}
                        />
                    </View>

                    <View style={{ marginTop: 6 }}>
                        <Text style={g.text.smallStrong}>Tipo de selector</Text>
                        <TextInput
                            value={c.selectorType || ''}
                            onChangeText={(t) => update(idx, { selectorType: (t.trim() || undefined) as SelectorType })}
                            placeholder="auto | brm | brmna | sino | volts | ohms | qty | combo"
                            placeholderTextColor={colors.mutedText}
                            style={[s.input, { marginTop: 6 }]}
                        />
                        {c.selectorType === 'combo' && (
                            <View style={{ marginTop: 6 }}>
                                <Text style={g.text.smallStrong}>Opciones (|)</Text>
                                <TextInput
                                    value={(c.options || []).join(' | ')}
                                    onChangeText={(t) => update(idx, { options: t.split('|').map((x) => x.trim()).filter(Boolean) })}
                                    placeholder="op1 | op2 | op3"
                                    placeholderTextColor={colors.mutedText}
                                    style={[s.input, { marginTop: 6 }]}
                                />
                            </View>
                        )}
                    </View>

                    <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Pressable
                            onPress={() => update(idx, { required: !c.required })}
                            style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.inputBorder, alignItems: 'center', justifyContent: 'center' }}
                        >
                            {c.required ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                        </Pressable>
                        <Text>Requerida</Text>
                    </View>

                    <View style={{ marginTop: 6 }}>
                        <Text style={g.text.caption}>
                            Sugerencia: para el layout clásico como en “Torre Grúa” usa keys: <Text style={{ fontWeight: '700' }}>n</Text>,{' '}
                            <Text style={{ fontWeight: '700' }}>valor</Text>, <Text style={{ fontWeight: '700' }}>observacion</Text>. El selectorType de{' '}
                            <Text style={{ fontWeight: '700' }}>valor</Text> puede ser <Text style={{ fontWeight: '700' }}>auto</Text> para tomar el del ítem.
                        </Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

function suggest(bases: string[], existing: { key: string }[]) {
    const set = new Set(existing.map((x) => x.key));
    for (const base of bases) {
        let i = 1;
        while (set.has(`${base}${i}`)) i++;
        return `${base}${i}`;
    }
    return `col${Math.floor(Math.random() * 999)}`;
}

export default ChecklistRetoEditor;
