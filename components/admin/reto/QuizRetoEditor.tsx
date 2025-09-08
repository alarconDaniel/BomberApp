// components/admin/reto/QuizRetoEditor.tsx
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { EditorHandle } from './types';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';
import { useAuth } from '../../../auth/AuthContext';

// ==== Tipos locales ====
type ABCDOption = { texto: string; correcta: boolean; codOpcion?: number };  // <—
type PregABCD = {
    codPregunta?: number;                                                     // <—
    tipo: 'abcd'; numero: number; enunciado: string; puntos: number; tiempoMax: number;
    opciones: ABCDOption[];
};
type PregRellenar = {
    codPregunta?: number;                                                     // <—
    tipo: 'rellenar'; numero: number; enunciado: string; puntos: number; tiempoMax: number;
    rellenar: { respuesta: string };
};
type PregEmparejar = {
    codPregunta?: number;                                                     // <—
    tipo: 'emparejar'; numero: number; enunciado: string; puntos: number; tiempoMax: number;
    emparejar: { A: string[]; B: string[]; parejas: Array<[number, number]> };
};

type Pregunta = PregABCD | PregRellenar | PregEmparejar;

export type QuizRetoEditorProps = {
    colors: any;
    g: ReturnType<typeof makeGlobalStyles>;
    codReto?: number;            // para edición: hidratar desde back
    initialConfig?: any;         // opcional, por compatibilidad
};

// ==== Utilidades de creación por defecto ====
const newABCD = (n: number): PregABCD => ({
    tipo: 'abcd', numero: n, enunciado: '', puntos: 1, tiempoMax: 60,
    opciones: [{ texto: '', correcta: false }, { texto: '', correcta: false }]
});
const newRellenar = (n: number): PregRellenar => ({
    tipo: 'rellenar', numero: n, enunciado: '', puntos: 1, tiempoMax: 60,
    rellenar: { respuesta: '' }
});
const newEmparejar = (n: number): PregEmparejar => ({
    tipo: 'emparejar', numero: n, enunciado: '', puntos: 1, tiempoMax: 60,
    emparejar: { A: ['',''], B: ['',''], parejas: [] }
});

// ==== Normalizador: payloads distintos del backend -> nuestro modelo editable ====
function normalizePregunta(raw: any): Pregunta {
    const codPregunta = Number(raw?.codPregunta ?? raw?.cod_pregunta ?? 0) || undefined;
    const base = {
        numero: Number(raw?.numero ?? raw?.numero_pregunta ?? 0) || 1,
        enunciado: String(raw?.enunciado ?? raw?.enunciado_pregunta ?? ''),
        puntos: Number(raw?.puntos ?? raw?.puntos_pregunta ?? 1) || 1,
        tiempoMax: Number(raw?.tiempoMax ?? raw?.tiempo_max_pregunta ?? 60) || 60,
    };
    const tipo = String(raw?.tipo ?? raw?.tipo_pregunta ?? '').toLowerCase();


    if (tipo === 'abcd') {
        const opciones: ABCDOption[] = (raw?.opciones ?? raw?.options ?? []).map((o: any) => ({
            codOpcion: Number(o?.codOpcion ?? o?.cod_opcion ?? 0) || undefined,               // <—
            texto: String(o?.texto ?? o?.texto_opcion ?? ''),
            correcta: !!Number(o?.correcta ?? o?.validez_opcion ?? 0),
        }));
        return { codPregunta, tipo: 'abcd', ...base, opciones: opciones.length ? opciones : [
                { texto: '', correcta: false }, { texto: '', correcta: false },
            ]};
    }

    if (tipo === 'rellenar') {
        const respuesta = String(raw?.correcta ?? raw?.respuesta_correcta ?? raw?.rellenar?.respuesta ?? '').trim();
        return { codPregunta, tipo: 'rellenar', ...base, rellenar: { respuesta } };
    }

    // EMPAREJAR: puede venir como { items: [{lado:'A'|'B', contenido, codItem}] } o como { emparejar: {A,B} }
    if (tipo === 'emparejar') {
        let A: string[] = [];
        let B: string[] = [];
        // 1) Sacar columnas
        if (raw?.emparejar) {
            A = Array.isArray(raw.emparejar.A) ? raw.emparejar.A.map((x: any) => String(x?.contenido ?? x)) : [];
            B = Array.isArray(raw.emparejar.B) ? raw.emparejar.B.map((x: any) => String(x?.contenido ?? x)) : [];
        } else if (raw?.items) {
            const items = Array.isArray(raw.items) ? raw.items : [];
            A = items.filter((i: any) => String(i?.lado ?? '').toUpperCase() === 'A').map((i: any) => String(i?.contenido ?? ''));
            B = items.filter((i: any) => String(i?.lado ?? '').toUpperCase() === 'B').map((i: any) => String(i?.contenido ?? ''));
        }

        // 2) Mapear parejas a índices (robusto a varios formatos)
        let parejas: Array<[number, number]> = [];
        const items = Array.isArray(raw?.items) ? raw.items : [];

        // Índices por codItem, si existen
        const idxA: Record<number, number> = {};
        const idxB: Record<number, number> = {};
        if (items.length) {
            items.forEach((i: any, idx: number) => {
                const lado = String(i?.lado ?? '').toUpperCase();
                const cod = Number(i?.codItem ?? i?.cod_item ?? NaN);
                const contenido = String(i?.contenido ?? '');
                if (lado === 'A') {
                    // preferir por orden en A
                    const pos = A.indexOf(contenido);
                    if (Number.isInteger(cod)) idxA[cod] = pos;
                } else if (lado === 'B') {
                    const pos = B.indexOf(contenido);
                    if (Number.isInteger(cod)) idxB[cod] = pos;
                }
            });
        }

        if (Array.isArray(raw?.parejas)) {
            // varios formatos posibles
            parejas = (raw.parejas as any[])
                .map((p: any): [number | undefined, number | undefined] => {
                    // formato 1: ya vienen como [aIndex, bIndex]
                    if (Array.isArray(p) && p.length === 2) {
                        const ai = Number(p[0]); const bi = Number(p[1]);
                        if (Number.isInteger(ai) && Number.isInteger(bi)) return [ai, bi];
                    }
                    // formato 2: { aIndex, bIndex } o { a_idx, b_idx }
                    const aIdx = Number(p?.aIndex ?? p?.a_idx ?? p?.aPos ?? NaN);
                    const bIdx = Number(p?.bIndex ?? p?.b_idx ?? p?.bPos ?? NaN);
                    if (Number.isInteger(aIdx) && Number.isInteger(bIdx)) return [aIdx, bIdx];
                    // formato 3: { a, b } donde a/b son codItem
                    const aCod = Number(p?.a ?? p?.codA ?? NaN);
                    const bCod = Number(p?.b ?? p?.codB ?? NaN);
                    const ai = Number.isInteger(aCod) ? idxA[aCod] : undefined;
                    const bi = Number.isInteger(bCod) ? idxB[bCod] : undefined;
                    return [ai, bi];
                })
                .filter((pair): pair is [number, number] =>
                    Number.isFinite(pair[0]) && Number.isFinite(pair[1]) &&
                    pair[0]! >= 0 && pair[0]! < A.length &&
                    pair[1]! >= 0 && pair[1]! < B.length
                );
        }

        return { codPregunta, tipo: 'emparejar', ...base, emparejar: { A, B, parejas } };
    }

    // Fallback seguro: tratamos como rellenar
    return { codPregunta, tipo: 'rellenar', ...base, rellenar: { respuesta: '' } };
}

// ==== Input con etiqueta encima (para que no quede "1 25 50" sin contexto) ====
function LabeledInput({ label, children, colors }: { label: string; children: React.ReactNode; colors: any }) {
    return (
        <View style={{ flexShrink: 1 }}>
            <Text style={{ fontSize: 12, color: colors.mutedText, marginBottom: 4 }}>{label}</Text>
            {children}
        </View>
    );
}

// ==== Editor de una pregunta ====
function QuestionEditor({ q, onChange, onRemove, colors, g }: {
    q: Pregunta;
    onChange: (p: Pregunta) => void;
    onRemove?: () => void;
    colors: any;
    g: ReturnType<typeof makeGlobalStyles>;
}) {
    const s = useMemo(() => StyleSheet.create({
        card: { borderWidth: 1, borderColor: colors.tabBorder, backgroundColor: colors.card, borderRadius: 12, padding: 12 },
        row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
        input: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 40, backgroundColor: colors.card, color: colors.text },
        badge: { height: 26, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.cardTint, justifyContent: 'center' as const },
        enunciadoBox: { borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.mutedBg, borderRadius: 10, padding: 10, marginTop: 10, minHeight: 80 },
        optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
        optionBox: { borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.cardTint, borderRadius: 10, padding: 10, flex: 1 },
        // IMPORTANTE: columnas apiladas verticalmente para móvil
        colWrap: { flexDirection: 'column', gap: 10, marginTop: 8 },
        col: { width: '100%', borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.mutedBg, borderRadius: 10, padding: 10 },
        addBtn: { marginTop: 8, alignSelf: 'flex-start' as const, paddingHorizontal: 12, height: 36, borderRadius: 10, justifyContent: 'center', borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.mutedBg },
        pairRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    }), [colors]);

    const onPrimary = colors.onPrimaryText ?? '#fff';

    return (
        <View style={s.card}>
            {/* Encabezado: Tipo + eliminar */}
            <View style={[s.row, { alignItems: 'center', justifyContent: 'space-between' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={s.badge}><Text style={{ fontSize: 12, color: colors.mutedText }}>{q.tipo.toUpperCase()}</Text></View>
                </View>
                {onRemove ? (
                    <Pressable onPress={onRemove} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name="trash" size={18} color={colors.danger} />
                    </Pressable>
                ) : null}
            </View>

            {/* Nº + Tiempo + Puntos con etiqueta */}
            <View style={[s.row, { marginTop: 10 }]}>
                <LabeledInput label="Nº" colors={colors}>
                    <TextInput
                        value={String(q.numero)} keyboardType="numeric"
                        onChangeText={(t) => onChange({ ...q, numero: Math.max(1, Math.trunc(Number(t) || 1)) })}
                        placeholder="1"
                        placeholderTextColor={colors.mutedText}
                        style={[s.input, { width: 80 }]}
                    />
                </LabeledInput>

                <LabeledInput label="Tiempo (s)" colors={colors}>
                    <TextInput
                        value={String(q.tiempoMax)} keyboardType="numeric"
                        onChangeText={(t) => onChange({ ...q, tiempoMax: Math.max(1, Math.trunc(Number(t) || 1)) })}
                        placeholder="60"
                        placeholderTextColor={colors.mutedText}
                        style={[s.input, { width: 110 }]}
                    />
                </LabeledInput>

                <LabeledInput label="Puntos" colors={colors}>
                    <TextInput
                        value={String(q.puntos)} keyboardType="numeric"
                        onChangeText={(t) => onChange({ ...q, puntos: Math.max(0, Math.trunc(Number(t) || 0)) })}
                        placeholder="1"
                        placeholderTextColor={colors.mutedText}
                        style={[s.input, { width: 100 }]}
                    />
                </LabeledInput>
            </View>

            {/* Enunciado más “gordito” y con wrap */}
            <View style={s.enunciadoBox}>
                <Text style={{ fontSize: 12, color: colors.mutedText, marginBottom: 6 }}>Enunciado</Text>
                <TextInput
                    value={q.enunciado}
                    onChangeText={(t) => onChange({ ...q, enunciado: t })}
                    placeholder="Enunciado de la pregunta"
                    placeholderTextColor={colors.mutedText}
                    multiline
                    style={{ minHeight: 52, color: colors.text }}
                />
            </View>

            {/* Cuerpo según tipo */}
            {q.tipo === 'abcd' && (
                <View style={{ marginTop: 8 }}>
                    {(q as PregABCD).opciones.map((o, j) => (
                        <View key={j} style={s.optionRow}>
                            <Pressable
                                onPress={() => {
                                    const opciones = (q as PregABCD).opciones.slice();
                                    opciones[j] = { ...opciones[j], correcta: !opciones[j].correcta };
                                    onChange({ ...(q as PregABCD), opciones });
                                }}
                                style={[s.badge, { borderColor: colors.inputBorder, backgroundColor: o.correcta ? colors.primary : colors.cardTint }]}
                            >
                                <Text style={{ fontSize: 12, color: o.correcta ? onPrimary : colors.mutedText }}>
                                    {o.correcta ? 'Correcta' : 'Opción'}
                                </Text>
                            </Pressable>
                            <View style={s.optionBox}>
                                <TextInput
                                    value={o.texto}
                                    onChangeText={(t) => {
                                        const opciones = (q as PregABCD).opciones.slice();
                                        opciones[j] = { ...opciones[j], texto: t };
                                        onChange({ ...(q as PregABCD), opciones });
                                    }}
                                    placeholder={`Opción ${j + 1}`}
                                    placeholderTextColor={colors.mutedText}
                                    style={{ color: colors.text }}
                                />
                            </View>
                            <Pressable
                                onPress={() => {
                                    const opciones = (q as PregABCD).opciones.filter((_, k) => k !== j);
                                    onChange({ ...(q as PregABCD), opciones });
                                }}
                                style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Ionicons name="trash" size={18} color={colors.danger} />
                            </Pressable>
                        </View>
                    ))}
                    <Pressable
                        onPress={() => {
                            const opciones = (q as PregABCD).opciones.concat({ texto: '', correcta: false });
                            onChange({ ...(q as PregABCD), opciones });
                        }}
                        style={s.addBtn}
                    >
                        <Text style={{ color: colors.text }}>Añadir opción</Text>
                    </Pressable>
                </View>
            )}

            {q.tipo === 'rellenar' && (
                <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.mutedText, marginBottom: 4 }}>Respuesta correcta</Text>
                    <TextInput
                        value={(q as PregRellenar).rellenar.respuesta}
                        onChangeText={(t) => onChange({ ...(q as PregRellenar), rellenar: { respuesta: t } })}
                        placeholder="Escribe la respuesta exacta"
                        placeholderTextColor={colors.mutedText}
                        style={[s.input]}
                    />
                </View>
            )}

            {q.tipo === 'emparejar' && (
                <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: colors.mutedText }}>Emparejar: edita las columnas y define parejas</Text>

                    {/* Columna A (arriba) */}
                    <View style={s.colWrap}>
                        <View style={s.col}>
                            <Text style={{ fontSize: 12, color: colors.mutedText, marginBottom: 6 }}>Columna A</Text>
                            {(q as PregEmparejar).emparejar.A.map((txt, i) => (
                                <View key={`A-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                    <View style={{ width: 22, alignItems: 'center' }}>
                                        <Text style={{ color: colors.mutedText }}>{i + 1}</Text>
                                    </View>
                                    <View style={{ flex: 1, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 10 }}>
                                        <TextInput
                                            value={txt}
                                            onChangeText={(t) => {
                                                const A = (q as PregEmparejar).emparejar.A.slice();
                                                A[i] = t;
                                                onChange({ ...(q as PregEmparejar), emparejar: { ...(q as PregEmparejar).emparejar, A } });
                                            }}
                                            placeholder={`A${i + 1}`}
                                            placeholderTextColor={colors.mutedText}
                                            style={{ height: 40, color: colors.text }}
                                        />
                                    </View>
                                    <Pressable
                                        onPress={() => {
                                            const A = (q as PregEmparejar).emparejar.A.filter((_, k) => k !== i);
                                            // Limpiar parejas que referencian este índice y renumerar
                                            const parejas = (q as PregEmparejar).emparejar.parejas
                                                .filter(([a]) => a !== i)
                                                .map(([a, b]) => [a > i ? a - 1 : a, b]) as Array<[number, number]>;
                                            onChange({ ...(q as PregEmparejar), emparejar: { A, B: (q as PregEmparejar).emparejar.B, parejas } });
                                        }}
                                        style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Ionicons name="close" size={18} color={colors.danger} />
                                    </Pressable>
                                </View>
                            ))}
                            <Pressable
                                onPress={() => {
                                    const A = (q as PregEmparejar).emparejar.A.concat('');
                                    onChange({ ...(q as PregEmparejar), emparejar: { ...(q as PregEmparejar).emparejar, A } });
                                }}
                                style={s.addBtn}
                            >
                                <Text style={{ color: colors.text }}>Añadir A</Text>
                            </Pressable>
                        </View>

                        {/* Columna B (abajo) */}
                        <View style={s.col}>
                            <Text style={{ fontSize: 12, color: colors.mutedText, marginBottom: 6 }}>Columna B</Text>
                            {(q as PregEmparejar).emparejar.B.map((txt, i) => (
                                <View key={`B-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                    <View style={{ width: 22, alignItems: 'center' }}>
                                        <Text style={{ color: colors.mutedText }}>{i + 1}</Text>
                                    </View>
                                    <View style={{ flex: 1, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 10 }}>
                                        <TextInput
                                            value={txt}
                                            onChangeText={(t) => {
                                                const B = (q as PregEmparejar).emparejar.B.slice();
                                                B[i] = t;
                                                onChange({ ...(q as PregEmparejar), emparejar: { ...(q as PregEmparejar).emparejar, B } });
                                            }}
                                            placeholder={`B${i + 1}`}
                                            placeholderTextColor={colors.mutedText}
                                            style={{ height: 40, color: colors.text }}
                                        />
                                    </View>
                                    <Pressable
                                        onPress={() => {
                                            const B = (q as PregEmparejar).emparejar.B.filter((_, k) => k !== i);
                                            // Limpiar parejas que referencian este índice y renumerar
                                            const parejas = (q as PregEmparejar).emparejar.parejas
                                                .filter(([, b]) => b !== i)
                                                .map(([a, b]) => [a, b > i ? b - 1 : b]) as Array<[number, number]>;
                                            onChange({ ...(q as PregEmparejar), emparejar: { A: (q as PregEmparejar).emparejar.A, B, parejas } });
                                        }}
                                        style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Ionicons name="close" size={18} color={colors.danger} />
                                    </Pressable>
                                </View>
                            ))}
                            <Pressable
                                onPress={() => {
                                    const B = (q as PregEmparejar).emparejar.B.concat('');
                                    onChange({ ...(q as PregEmparejar), emparejar: { ...(q as PregEmparejar).emparejar, B } });
                                }}
                                style={s.addBtn}
                            >
                                <Text style={{ color: colors.text }}>Añadir B</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Parejas */}
                    <View style={{ marginTop: 10, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.cardTint, borderRadius: 10, padding: 10 }}>
                        <Text style={{ fontSize: 12, color: colors.mutedText }}>Parejas (usa índices de A y B)</Text>
                        {(q as PregEmparejar).emparejar.parejas.map(([a, b], i) => (
                            <View key={`pair-${i}`} style={s.pairRow}>
                                <Text style={{ flex: 1, color: colors.text }}>A{a + 1} ↔ B{b + 1}</Text>
                                <Pressable
                                    onPress={() => {
                                        const parejas = (q as PregEmparejar).emparejar.parejas.filter((_, k) => k !== i);
                                        onChange({ ...(q as PregEmparejar), emparejar: { ...(q as PregEmparejar).emparejar, parejas } });
                                    }}
                                    style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <Ionicons name="trash" size={16} color={colors.danger} />
                                </Pressable>
                            </View>
                        ))}

                        {/* Añadir pareja */}
                        <AddPairRow
                            colors={colors}
                            g={g}
                            maxA={(q as PregEmparejar).emparejar.A.length}
                            maxB={(q as PregEmparejar).emparejar.B.length}
                            onAdd={(a1, b1) => {
                                if (!Number.isFinite(a1) || !Number.isFinite(b1)) return;
                                if (a1 < 1 || b1 < 1) return;
                                if (a1 > (q as PregEmparejar).emparejar.A.length) return;
                                if (b1 > (q as PregEmparejar).emparejar.B.length) return;
                                const parejas = (q as PregEmparejar).emparejar.parejas.concat([[a1 - 1, b1 - 1]]);
                                onChange({ ...(q as PregEmparejar), emparejar: { ...(q as PregEmparejar).emparejar, parejas } });
                            }}
                        />
                    </View>
                </View>
            )}
        </View>
    );
}

function AddPairRow({ colors, g, maxA, maxB, onAdd }: { colors: any; g: any; maxA: number; maxB: number; onAdd: (aIdx1Based: number, bIdx1Based: number) => void }) {
    const [a, setA] = useState<string>('');
    const [b, setB] = useState<string>('');
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.mutedText }}>A (#)</Text>
                <TextInput
                    value={a}
                    keyboardType="numeric"
                    onChangeText={setA}
                    placeholder={`1-${maxA}`}
                    placeholderTextColor={colors.mutedText}
                    style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 40, backgroundColor: colors.card, color: colors.text }}
                />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: colors.mutedText }}>B (#)</Text>
                <TextInput
                    value={b}
                    keyboardType="numeric"
                    onChangeText={setB}
                    placeholder={`1-${maxB}`}
                    placeholderTextColor={colors.mutedText}
                    style={{ borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 40, backgroundColor: colors.card, color: colors.text }}
                />
            </View>
            <Pressable
                onPress={() => {
                    const ai = Math.trunc(Number(a));
                    const bi = Math.trunc(Number(b));
                    if (ai && bi) { onAdd(ai, bi); setA(''); setB(''); }
                }}
                style={{ height: 40, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.mutedBg }}
            >
                <Text style={{ color: colors.text }}>Añadir pareja</Text>
            </Pressable>
        </View>
    );
}

const QuizRetoEditor = forwardRef<EditorHandle, QuizRetoEditorProps>(
    ({ colors, g, codReto, initialConfig }, ref) => {
        const { fetchJson } = useAuth();
        const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
        const [loading, setLoading] = useState<boolean>(false);

        // ===== Hydrate desde /reto/ver/full/:cod =====
        useEffect(() => {
            if (!codReto) return;
            let mounted = true;
            (async () => {
                try {
                    setLoading(true);
                    const data = await fetchJson(`/reto/ver/full/${codReto}`, { method: 'GET' });
                    const raw = data?.quiz?.preguntas || [];
                    const mapped = raw.map(normalizePregunta).sort((a: any, b: any) => a.numero - b.numero);
                    if (mounted) setPreguntas(mapped);
                } finally { if (mounted) setLoading(false); }
            })();
            return () => { mounted = false; };
        }, [codReto, fetchJson]);

        // ===== Handle expuesto =====
        useImperativeHandle(ref, () => ({
            validate() {
                if (!preguntas.length) return false;
                for (const p of preguntas) {
                    if (!p.enunciado.trim()) return false;
                    if (p.tiempoMax <= 0) return false;
                    if (p.puntos < 0) return false;
                    if (p.tipo === 'abcd') {
                        const ops = (p as PregABCD).opciones;
                        if (!ops.length) return false;
                        if (!ops.every(o => o.texto.trim())) return false;
                        if (!ops.some(o => o.correcta)) return false;
                    }
                    if (p.tipo === 'rellenar') {
                        if (!(p as PregRellenar).rellenar.respuesta.trim()) return false;
                    }
                    if (p.tipo === 'emparejar') {
                        const { A, B } = (p as PregEmparejar).emparejar;
                        if (!A.length || !B.length) return false;
                    }
                }
                return true;
            },
            // ==== getConfig() ====
            getConfig() {
                return {
                    kind: 'quiz',
                    preguntas: preguntas.map((p, i) => {
                        const base: any = {
                            codPregunta: p.codPregunta,                                // <— incluye si existe
                            numero: Number(p.numero ?? i + 1),
                            enunciado: p.enunciado.trim(),
                            puntos: Number(p.puntos ?? 1),
                            tiempoMax: Number(p.tiempoMax ?? 60),
                            tipo: p.tipo,
                        };

                        if (p.tipo === 'abcd') {
                            base.opciones = (p as PregABCD).opciones.map(o => ({
                                codOpcion: o.codOpcion,                                   // <— incluye si existe
                                texto: o.texto.trim(),
                                correcta: !!o.correcta
                            }));
                        }
                        if (p.tipo === 'rellenar') {
                            base.rellenar = { respuesta: (p as PregRellenar).rellenar.respuesta.trim() };
                        }
                        if (p.tipo === 'emparejar') {
                            const emp = (p as PregEmparejar).emparejar;
                            base.emparejar = { A: emp.A.map(s => s.trim()), B: emp.B.map(s => s.trim()), parejas: emp.parejas.slice() };
                        }
                        return base;
                    }),
                };
            }
        }), [preguntas]);

        const s = useMemo(() => StyleSheet.create({
            empty: { padding: 12, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.mutedBg, borderRadius: 10 },
            addBtnRow: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 8, marginTop: 12 },
            addBtn: { paddingHorizontal: 12, height: 40, borderRadius: 10, justifyContent: 'center', borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.mutedBg },
        }), [colors]);

        if (loading) {
            return (
                <View style={{ paddingVertical: 10 }}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={{ textAlign: 'center', color: colors.mutedText, marginTop: 6 }}>Cargando preguntas…</Text>
                </View>
            );
        }

        return (
            <View style={{ marginTop: 12 }}>
                <Text style={g.text.smallStrong}>Preguntas del quiz</Text>
                {!preguntas.length ? (
                    <View style={[s.empty, { marginTop: 8 }]}>
                        <Text style={{ color: colors.mutedText }}>Aún no hay preguntas (o no se pudieron cargar).</Text>
                    </View>
                ) : null}

                {preguntas.map((p, idx) => (
                    <View key={idx} style={{ marginTop: 10 }}>
                        <QuestionEditor
                            q={p}
                            colors={colors}
                            g={g}
                            onChange={(np) => setPreguntas(prev => prev.map((x, i) => i === idx ? np : x))}
                            onRemove={() => setPreguntas(prev => prev.filter((_, i) => i !== idx))}
                        />
                    </View>
                ))}

                {/* Botones para añadir nueva pregunta de los TRES tipos */}
                <View style={s.addBtnRow}>
                    <Pressable
                        onPress={() => setPreguntas(prev => prev.concat(newABCD(prev.length + 1)))}
                        style={s.addBtn}
                    >
                        <Text style={{ color: colors.text }}>Añadir ABCD</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setPreguntas(prev => prev.concat(newRellenar(prev.length + 1)))}
                        style={s.addBtn}
                    >
                        <Text style={{ color: colors.text }}>Añadir Rellenar</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setPreguntas(prev => prev.concat(newEmparejar(prev.length + 1)))}
                        style={s.addBtn}
                    >
                        <Text style={{ color: colors.text }}>Añadir Emparejar</Text>
                    </Pressable>
                </View>
            </View>
        );
    }
);

export default QuizRetoEditor;
