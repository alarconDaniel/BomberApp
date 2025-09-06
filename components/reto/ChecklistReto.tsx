// components/reto/ChecklistReto.tsx
import React, {useMemo, useState} from 'react';
import {View, Text, TextInput, ScrollView, Pressable, Alert, StyleSheet} from 'react-native';
import {useTheme} from '../../theme/ThemeProvider';
import {makeGlobalStyles} from '../../theme/GlobalStyles';
import {
    ColumnDef, ItemDef, ItemValor, PrimitiveField,
    humanTitle, nowHHmm, todayYMD, getColumns
} from './utils';
import {asJson} from './utils';
import {BRMSeg, BRMNASeg, SiNoToggle, ComboBox, ACToggle} from './controls';

export default function ChecklistReto({
                                          codReto,
                                          codUsuarioReto,
                                          metadataReto,
                                          fetchJson,
                                          onSent
                                      }:{
    codReto:number;
    codUsuarioReto:number;
    metadataReto:any;
    fetchJson:<T=any>(url:string, init?:any)=>Promise<T>;
    onSent:()=>void;
}) {
    const {colors, isDark} = useTheme();
    const g = makeGlobalStyles(colors);
    const styles = useMemo(()=>StyleSheet.create({
        hSep:{height:1, backgroundColor: colors.divider, marginVertical:10},
        cellBadge:{paddingVertical:3, paddingHorizontal:8, borderRadius:6, backgroundColor: colors.card, borderWidth:1, borderColor: colors.divider},
        sectionHeader:{paddingHorizontal:16, marginBottom:8, flexDirection:'row', alignItems:'center'},
        sectionBar:{height:6, borderRadius:999, backgroundColor: colors.mutedBg, marginLeft:10, flex:1},
        sectionTitle:{marginVertical:14, fontSize:18, fontWeight:'700', color: colors.text},
        obsInput:{borderWidth:1, borderColor: colors.divider, borderRadius:8, paddingVertical:6, paddingHorizontal:8, color: colors.text}
    }), [colors, isDark]);

    const danger = '#dc3545';
    const meta = metadataReto || {};
    const columnsDefault = getColumns(meta);
    const metaColsByGroup = (meta?.schema?.columnsByGroup) || {};

    // helpers para coincidencia exacta por etiqueta visible
    const norm = (s:string) => s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
    const isLabel = (label:string, target:string) => norm(label) === norm(target);
    const getLabel = (k:string, def:any) => (def?.label ?? humanTitle(k));

    const getColsForGroup = (groupName: string): ColumnDef[] => {
        const cg = metaColsByGroup?.[groupName];
        if (Array.isArray(cg) && cg.length) return cg;
        return columnsDefault;
    };
    const isNumericSelector = (sel?: ColumnDef['selectorType']) => sel==='volts' || sel==='ohms' || sel==='qty';
    const isComboSelector  = (sel?: ColumnDef['selectorType']) => sel==='combo';
    const hideItemNumber = !!meta?.ui?.hideItemNumber;
    const needsExtraRef = (texto: string) => /ref\.|serie|unds|_{3,}/i.test(texto);

    const isElementosGroup = (g:string) => g === 'ELEMENTOS DEL EQUIPO';
    const isSolicitudGroup = (g:string) => g.startsWith('SOLICITUD DE REPUESTOS Y SUMINISTROS');

    // ===== Estado =====
    // Solo autocompletar: "Fecha" y "Hora inicio" al cargar; "Hora final" se sella al enviar.
    const [headerVals, setHeaderVals] = useState<Record<string,string>>(()=>{
        const header = meta?.schema?.header ?? {};
        const hv: Record<string,string> = {};
        Object.entries(header).forEach(([k, def]: any)=>{
            const label = getLabel(k, def);
            if (isLabel(label, 'Fecha')) hv[k] = todayYMD();
            else if (isLabel(label, 'Hora inicio')) hv[k] = nowHHmm();
            else hv[k] = '';
        });
        return hv;
    });

    const [itemsVals, setItemsVals] = useState<ItemValor[]>(()=>{
        const items: ItemDef[] = (meta?.schema?.items ?? []).slice().sort((a:any,b:any)=>a.n-b.n);
        return items.map(it=>({ n: it.n, valor: null, estado: null, observacion:'', __selectorAuto: it.selector }));
    });

    const [firmasVals, setFirmasVals] = useState<any>(() => {
        const firmasSchema = meta?.schema?.firmas || null;
        if (!firmasSchema) return {};
        const out: any = {};
        Object.entries(firmasSchema || {}).forEach(([bloque, cfg]: any) => {
            const fields = cfg?.fields || {};
            const seed: any = {};
            Object.keys(fields).forEach((k)=>{ seed[k] = ''; });
            out[bloque] = seed;
        });
        return out;
    });

    const [showChecklistErrors, setShowChecklistErrors] = useState(false);

    /* ========= Validación detallada ========= */
    const validarChecklistDetallado = () => {
        const schema = meta?.schema ?? {};
        const header = schema.header ?? {};
        const defs: ItemDef[] = (schema.items ?? []);
        const falt: string[] = [];
        const errorKeys = new Set<string>();

        // Header (omitir únicamente "Hora final" porque se sella al enviar)
        Object.entries(header).forEach(([k, def]: any) => {
            const req = !!def?.required;
            const v = (headerVals[k] ?? '').toString().trim();
            const label = getLabel(k, def);
            const isHoraFinal = isLabel(label, 'Hora final');
            if (req && !v && !isHoraFinal) {
                falt.push(`Encabezado: ${label}`);
                errorKeys.add(`header:${k}`);
            }
        });

        // Items
        const byN = new Map<number, ItemValor>();
        itemsVals.forEach(it => byN.set(it.n, it));

        for (const def of defs) {
            const v: ItemValor = byN.get(def.n) ?? ({} as ItemValor);
            const colsForGroup = getColsForGroup(def.grupo);

            if (isElementosGroup(def.grupo)) {
                if (!(v.solicitud_montaje ?? '').toString().trim()) {
                    falt.push(`${def.texto} > Solicitud de montaje`);
                    errorKeys.add(`item:${def.n}:solicitud_montaje`);
                }
                const revOk = !!v.revision && ['Revisión técnica', 'Medidas'].includes(String(v.revision));
                if (!revOk) {
                    falt.push(`${def.texto} > Revisión`);
                    errorKeys.add(`item:${def.n}:revision`);
                }
                if (!(v.verificacion_jefe ?? '').toString().trim()) {
                    falt.push(`${def.texto} > Verificación Jefe Patio`);
                    errorKeys.add(`item:${def.n}:verificacion_jefe`);
                }
                if (String(v.nota) === 'D___M___A___') {
                    const f = (v.nota_fecha ?? '').toString().trim();
                    if (!f) {
                        falt.push(`${def.texto} > Fecha (D___M___A___)`);
                        errorKeys.add(`item:${def.n}:nota_fecha`);
                    }
                }
                if (needsExtraRef(def.texto)) {
                    if (!(v.ref ?? '').toString().trim()) {
                        falt.push(`${def.texto} > Referencia`);
                        errorKeys.add(`item:${def.n}:ref`);
                    }
                }
                continue;
            }

            if (isSolicitudGroup(def.grupo)) {
                const sol = ((v as any).solicita ?? '').toString().trim();
                const cant = ((v as any).cantidad ?? '').toString().trim();
                const fec = ((v as any).fecha ?? '').toString().trim();
                if (!sol) {
                    falt.push(`${def.texto} > Técnico Solicita`);
                    errorKeys.add(`item:${def.n}:solicita`);
                }
                if (!cant || Number.isNaN(Number(cant))) {
                    falt.push(`${def.texto} > Cantidad`);
                    errorKeys.add(`item:${def.n}:cantidad`);
                }
                if (!fec) {
                    falt.push(`${def.texto} > Fecha solicitud`);
                    errorKeys.add(`item:${def.n}:fecha`);
                }
                continue;
            }

            const hasValorCol = colsForGroup.some(c => c.key === 'valor');
            const hasEstadoCol = colsForGroup.some(c => c.key === 'estado');
            const otherCols = colsForGroup.filter(c =>
                !['n', 'valor', 'estado', 'observacion'].includes(c.key)
            );
            const label = `${def.grupo} – ${def.texto}`;

            if (hasValorCol) {
                const col = colsForGroup.find(c => c.key === 'valor');
                const expected: ColumnDef['selectorType'] =
                    (col?.selectorType || 'auto') === 'auto' ? (def.selector || 'brm') : (col!.selectorType!);
                const raw = v?.valor;
                const isEmpty = raw === '' || raw === null || typeof raw === 'undefined';
                const isReq = !!col?.required || !!def.required;

                if (isReq) {
                    if (isNumericSelector(expected)) {
                        if (isEmpty || Number.isNaN(Number(raw))) {
                            falt.push(`${label} (${col?.label || 'Valor'})`);
                            errorKeys.add(`item:${def.n}:valor`);
                        }
                    } else if (expected === 'sino') {
                        const ok = ['SI', 'NO'].includes((raw ?? '').toString().toUpperCase());
                        if (!ok) {
                            falt.push(`${label} (${col?.label || 'Inspeccionado'})`);
                            errorKeys.add(`item:${def.n}:valor`);
                        }
                    } else if (isComboSelector(expected)) {
                        const opts = (col?.options || []) as string[];
                        const ok = !isEmpty && (opts.length === 0 || opts.includes(String(raw)));
                        if (!ok) {
                            falt.push(`${label} (${col?.label || 'Selección'})`);
                            errorKeys.add(`item:${def.n}:valor`);
                        }
                    } else if (expected === 'brm') {
                        const ok = ['B', 'R', 'M'].includes(String(raw));
                        if (!ok) {
                            falt.push(`${label} (${col?.label || 'Seleccione'})`);
                            errorKeys.add(`item:${def.n}:valor`);
                        }
                    } else if (expected === 'brmna') {
                        const ok = ['B', 'R', 'M', 'NA'].includes(String(raw));
                        if (!ok) {
                            falt.push(`${label} (${col?.label || 'Seleccione'})`);
                            errorKeys.add(`item:${def.n}:valor`);
                        }
                    }
                }
            }

            for (const c of otherCols) {
                const raw = (v as any)?.[c.key];
                const isEmpty = raw === '' || raw === null || typeof raw === 'undefined';
                if (!c.required) continue;

                if (c.selectorType === 'combo') {
                    const ok = !isEmpty && ((c.options || []).length === 0 || (c.options || []).includes(String(raw)));
                    if (!ok) { falt.push(`${label} (${c.label || c.key})`); errorKeys.add(`item:${def.n}:${c.key}`); }
                } else if (c.selectorType === 'text') {
                    if (isEmpty || !String(raw).trim()) { falt.push(`${label} (${c.label || c.key})`); errorKeys.add(`item:${def.n}:${c.key}`); }
                } else if (c.selectorType === 'qty') {
                    if (isEmpty || Number.isNaN(Number(raw))) { falt.push(`${label} (${c.label || c.key})`); errorKeys.add(`item:${def.n}:${c.key}`); }
                } else if (c.selectorType === 'sino') {
                    const ok = ['SI', 'NO'].includes((raw ?? '').toString().toUpperCase());
                    if (!ok) { falt.push(`${label} (${c.label || c.key})`); errorKeys.add(`item:${def.n}:${c.key}`); }
                }
            }

            if (hasEstadoCol || def.estado === true) {
                const estadoCol = colsForGroup.find(c => c.key === 'estado');
                const reqEstado = !!estadoCol?.required || !!def.required || def.estado === true;
                if (reqEstado) {
                    if (!v.estado || !['A', 'C'].includes(v.estado)) {
                        falt.push(`${label} (Estado A/C)`);
                        errorKeys.add(`item:${def.n}:estado`);
                    }
                }
            }
        }

        const firmasSchema = meta?.schema?.firmas || {};
        Object.entries(firmasSchema).forEach(([bloqueKey, bloqueCfg]: any) => {
            const fields = bloqueCfg?.fields || {};
            const vals = firmasVals?.[bloqueKey] || {};
            Object.entries(fields).forEach(([fk, fdef]: any) => {
                const req = !!fdef?.required;
                if (!req) return;
                const v = (vals?.[fk] ?? '').toString().trim();
                if (!v) {
                    const titulo = bloqueCfg?.title || humanTitle(bloqueKey);
                    const label = fdef?.label || humanTitle(fk);
                    falt.push(`Firmas: ${titulo} > ${label}`);
                    errorKeys.add(`firmas:${bloqueKey}:${fk}`);
                }
            });
        });

        return { ok: falt.length === 0, faltantes: falt, errorKeys };
    };

    const { ok: checklistOK, errorKeys } = useMemo(()=> validarChecklistDetallado(), [headerVals, itemsVals, firmasVals, meta, columnsDefault]);

    const enviar = async () => {
        const v = validarChecklistDetallado();
        if (!v.ok) {
            setShowChecklistErrors(true);
            Alert.alert('Faltan campos', `Por favor completa:\n\n• ${v.faltantes.join('\n• ')}`);
            return;
        }

        // Sellado automático SOLO para etiqueta exactamente "Hora final"
        const header = meta?.schema?.header ?? {};
        const headerSealed: Record<string,string> = {...headerVals};
        Object.entries(header).forEach(([k, def]: any)=>{
            const label = getLabel(k, def);
            if (isLabel(label, 'Hora final')) headerSealed[k] = nowHHmm();
        });

        const snapshot = { kind:'groupedChecklist', header: headerSealed, items: itemsVals, firmas: firmasVals };
        try {
            const r = await fetchJson(`/mis-retos/${codUsuarioReto}/form/enviar`, asJson({codUsuarioReto, codReto, data: snapshot}));
            Alert.alert('¡Listo!', `Formulario enviado ✅\n+${r.xpGanada} XP, +${r.coins} monedas`);
            onSent();
        } catch (e:any) { Alert.alert('Ups', e?.message || 'No pudimos enviar el formulario'); }
    };

    // ====== Render ======
    const errorSet = new Set<string>();
    if (showChecklistErrors) errorKeys.forEach(k=>errorSet.add(k));

    const header = meta?.schema?.header ?? {};
    const items: ItemDef[] = (meta?.schema?.items ?? []).slice().sort((a:any,b:any)=>a.n-b.n);
    const grupos = items.reduce<Record<string, ItemDef[]>>((acc, it)=>{ acc[it.grupo] = acc[it.grupo] || []; acc[it.grupo].push(it); return acc; }, {});

    const renderHeader = () => {
        const entries = Object.entries(header) as [string, any][];
        if (entries.length===0) return null;

        return (
            <View style={{marginTop:8}}>
                <Text style={[g.text.h2]}>Encabezado</Text>
                {entries.map(([k, def])=>{
                    const label = getLabel(k, def);
                    const isFecha = isLabel(label, 'Fecha');
                    const isHoraInicio = isLabel(label, 'Hora inicio');
                    const isHoraFinal  = isLabel(label, 'Hora final');

                    const disabled = isFecha || isHoraInicio || isHoraFinal;
                    const isErr = showChecklistErrors && errorSet.has(`header:${k}`);

                    return (
                        <View key={k} style={{marginTop:10}}>
                            <Text style={g.text.bodyStrong}>
                                {label}{def?.required ? ' *' : ''}
                            </Text>
                            <TextInput
                                editable={!disabled}
                                placeholder={isHoraFinal ? '(se asignará al enviar)' : label}
                                placeholderTextColor={colors.mutedText}
                                value={headerVals[k] ?? ''}
                                onChangeText={(t)=>setHeaderVals(s=>({...s,[k]:t}))}
                                style={{
                                    borderWidth:1, borderColor: isErr? danger: colors.divider, borderRadius:10,
                                    padding:10, color: colors.text, marginTop:8, backgroundColor: disabled? colors.mutedBg: 'transparent'
                                }}
                            />
                            {isHoraFinal && <Text style={[g.text.caption, {marginTop:4, color: colors.mutedText}]}>Este campo se sellará automáticamente al enviar.</Text>}
                            {isErr && <Text style={[g.text.caption, {marginTop:4, color: danger}]}>Campo obligatorio.</Text>}
                        </View>
                    );
                })}
            </View>
        );
    };

    const setItem = (n:number, patch: Partial<ItemValor>) => {
        setItemsVals(prev=>{
            const idx = prev.findIndex(it=>it.n===n);
            if (idx===-1) return [...prev, {n, ...patch} as ItemValor];
            const next = [...prev]; next[idx] = {...next[idx], ...patch}; return next;
        });
    };

    const unitLabel = (sel?: ColumnDef['selectorType']) => sel==='volts'? 'Volts': sel==='ohms'? 'Ohmios': '';

    const SectionHeaderRow = ({cols}:{cols:ColumnDef[]}) => {
        const showNum = !hideItemNumber;
        const hasValor = cols.some(c=>c.key==='valor');
        const hasEstado = cols.some(c=>c.key==='estado');
        const extraQty = cols.filter(c=> c.selectorType==='qty' && !['n','valor','estado','observacion'].includes(c.key));
        const otherCols = cols.filter(c=> !['n','valor','estado','observacion'].includes(c.key) && c.selectorType !== 'qty');
        const colV = cols.find(c=>c.key==='valor');
        const centerValorHeader = (colV?.selectorType==='qty');
        return (
            <View style={{flexDirection:'row', gap:6, marginTop:10, alignItems:'center'}}>
                {showNum && (
                    <View style={{width:46}}>
                        <Text style={[g.text.caption, {fontWeight:'700', textAlign:'center'}]}> </Text>
                    </View>
                )}
                {hasValor && (
                    <View style={{flex:2, alignItems: centerValorHeader? 'center':'flex-start'}}>
                        <Text style={[g.text.caption, {fontWeight:'700', textAlign: centerValorHeader?'center':'left'}]}>
                            {colV?.label ?? 'Seleccione'}
                        </Text>
                    </View>
                )}
                {otherCols.map(c=>(
                    <View key={c.key} style={{flex:1, alignItems:'center'}}>
                        <Text style={[g.text.caption, {fontWeight:'700', textAlign:'center'}]}>{c.label ?? c.key}</Text>
                    </View>
                ))}
                {extraQty.map(c=>(
                    <View key={c.key} style={{width:90, alignItems:'center'}}>
                        <Text style={[g.text.caption, {fontWeight:'700', textAlign:'center'}]}>{c.label ?? c.key}</Text>
                    </View>
                ))}
                {hasEstado && (
                    <View style={{width:56}}>
                        <Text style={[g.text.caption, {fontWeight:'700', textAlign:'center'}]}>
                            {cols.find(c=>c.key==='estado')?.label ?? 'Estado'}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    const renderGroup = (nombreGrupo:string, defs: ItemDef[]) => {
        const cols = getColsForGroup(nombreGrupo);
        const hasValor = cols.some(c=>c.key==='valor');
        const hasEstado = cols.some(c=>c.key==='estado');
        const showObs = cols.some(c=>c.key==='observacion');
        const otherCols = cols.filter(c=> !['n','valor','estado','observacion'].includes(c.key) && c.selectorType!=='qty');
        const extraQty = cols.filter(c=> c.selectorType==='qty' && !['n','valor','estado','observacion'].includes(c.key));

        const valorSelectorFor = (def: ItemDef): ColumnDef['selectorType'] => {
            const col = cols.find(c=>c.key==='valor');
            const st = col?.selectorType || 'auto';
            if (st==='auto') return (def.selector as any) || 'brm';
            return st;
        };
        const valorOptionsFor = (): string[] => (cols.find(c=>c.key==='valor')?.options) || [];

        const obsLabel = cols.find(c=>c.key==='observacion')?.label || 'Observación';
        const obsPlaceholder = (obsLabel.toLowerCase().includes('respuesta') ? 'Respuesta…' : `${obsLabel}…`);

        // ELEMENTOS (vertical)
        if (isElementosGroup(nombreGrupo)) {
            return (
                <View>
                    {defs.map((def, idxRow)=>{
                        const zebra = (idxRow % 2 === 0) ? {backgroundColor: colors.mutedBg} : null;
                        const fallback: ItemValor = { n: def.n, valor:null, estado:null, observacion:'', __selectorAuto: def.selector };
                        const val = itemsVals.find(x=>x.n===def.n) ?? fallback;
                        const err = (k:string)=> errorSet.has(`item:${def.n}:${k}`);
                        const showRef = needsExtraRef(def.texto);
                        return (
                            <View key={def.n} style={[{borderRadius:10, padding:10, marginBottom:10}, zebra]}>
                                <Text style={g.text.body}>{def.texto}</Text>

                                {showRef && (
                                    <View style={{marginTop:8}}>
                                        <Text style={g.text.bodyStrong}>Referencia *</Text>
                                        <TextInput
                                            placeholder="Ingrese referencia/serie"
                                            placeholderTextColor={colors.mutedText}
                                            value={val.ref ?? ''}
                                            onChangeText={(t)=>setItem(def.n, {ref:t})}
                                            style={{borderWidth:1, borderColor: err('ref')? danger: colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:6}}
                                        />
                                        {err('ref') && <Text style={[g.text.caption, {color: danger, marginTop:4}]}>Campo obligatorio.</Text>}
                                    </View>
                                )}

                                <View style={{marginTop:8}}>
                                    <Text style={g.text.bodyStrong}>Solicitud de montaje *</Text>
                                    <TextInput
                                        multiline placeholder="Detalle la solicitud de montaje…" placeholderTextColor={colors.mutedText}
                                        value={val.solicitud_montaje ?? ''} onChangeText={(t)=>setItem(def.n, {solicitud_montaje: t})}
                                        style={{borderWidth:1, borderColor: err('solicitud_montaje')? danger: colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:6, minHeight:80, textAlignVertical:'top'}}
                                    />
                                    {err('solicitud_montaje') && <Text style={[g.text.caption, {color: danger, marginTop:4}]}>Campo obligatorio.</Text>}
                                </View>

                                <View style={{marginTop:8}}>
                                    <Text style={g.text.bodyStrong}>Revisión *</Text>
                                    <ComboBox
                                        value={val.revision ?? null}
                                        onChange={(v)=>setItem(def.n, {revision:v})}
                                        options={(cols.find(c=>c.key==='revision')?.options) || ['Revisión técnica','Medidas']}
                                        placeholder="Seleccione revisión…" colors={colors} error={err('revision')}
                                    />
                                    {err('revision') && <Text style={[g.text.caption, {color: danger, marginTop:4}]}>Seleccione una opción.</Text>}
                                </View>

                                <View style={{marginTop:8}}>
                                    <Text style={g.text.bodyStrong}>Verificación Jefe Patio *</Text>
                                    <TextInput
                                        multiline placeholder="Verificación del jefe de patio…" placeholderTextColor={colors.mutedText}
                                        value={val.verificacion_jefe ?? ''} onChangeText={(t)=>setItem(def.n, {verificacion_jefe: t})}
                                        style={{borderWidth:1, borderColor: err('verificacion_jefe')? danger: colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:6, minHeight:80, textAlignVertical:'top'}}
                                    />
                                    {err('verificacion_jefe') && <Text style={[g.text.caption, {color: danger, marginTop:4}]}>Campo obligatorio.</Text>}
                                </View>

                                <View style={{marginTop:8}}>
                                    <Text style={g.text.bodyStrong}>Observación</Text>
                                    <TextInput
                                        placeholder="Observaciones…" placeholderTextColor={colors.mutedText}
                                        value={val.observacion ?? ''} onChangeText={(t)=>setItem(def.n, {observacion: t})}
                                        style={styles.obsInput}
                                    />
                                </View>

                                <View style={{marginTop:8}}>
                                    <Text style={g.text.bodyStrong}>Nota</Text>
                                    <ComboBox
                                        value={val.nota ?? null}
                                        onChange={(v)=>setItem(def.n, {nota:v, ...(v!=='D___M___A___'? {nota_fecha:''}: {})})}
                                        options={(cols.find(c=>c.key==='nota')?.options) || ['VERSION','FECHA DE EMISION','D___M___A___','Nota','Fecha','Fecha solicitud']}
                                        placeholder="Seleccione nota…" colors={colors} error={false}
                                    />
                                </View>

                                {val.nota==='D___M___A___' && (
                                    <View style={{marginTop:8}}>
                                        <Text style={g.text.bodyStrong}>Fecha (para D___M___A___) *</Text>
                                        <TextInput
                                            placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedText}
                                            value={val.nota_fecha ?? ''} onChangeText={(t)=>setItem(def.n, {nota_fecha: t})}
                                            style={{borderWidth:1, borderColor: err('nota_fecha')? danger: colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:6}}
                                        />
                                        {err('nota_fecha') && <Text style={[g.text.caption, {color: danger, marginTop:4}]}>Campo obligatorio.</Text>}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            );
        }

        // SOLICITUDES (vertical)
        if (isSolicitudGroup(nombreGrupo)) {
            return (
                <View>
                    {defs.map((def, idxRow)=>{
                        const zebra = (idxRow % 2 === 0) ? {backgroundColor: colors.mutedBg} : null;
                        const fallback: ItemValor = { n: def.n, valor:null, estado:null, observacion:'', __selectorAuto: def.selector };
                        const val = itemsVals.find(x=>x.n===def.n) ?? fallback;
                        const err = (k:string)=> errorSet.has(`item:${def.n}:${k}`);
                        return (
                            <View key={def.n} style={[{borderRadius:10, padding:10, marginBottom:10}, zebra]}>
                                <Text style={[g.text.body, {marginBottom:4}]}>{def.texto}</Text>

                                <Text style={g.text.bodyStrong}>Técnico Solicita *</Text>
                                <TextInput
                                    placeholder="Nombre del técnico / detalle…" placeholderTextColor={colors.mutedText}
                                    value={val.solicita ?? ''} onChangeText={(t)=>setItem(def.n, {solicita:t})}
                                    style={{borderWidth:1, borderColor: err('solicita')? danger: colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:6}}
                                />
                                {err('solicita') && <Text style={[g.text.caption, {color: danger, marginTop:4}]}>Campo obligatorio.</Text>}

                                <View style={{marginTop:8}}>
                                    <Text style={g.text.bodyStrong}>Cantidad *</Text>
                                    <TextInput
                                        keyboardType="numeric" placeholder="0" placeholderTextColor={colors.mutedText}
                                        value={val.cantidad!=null ? String(val.cantidad): ''} onChangeText={(t)=>setItem(def.n, {cantidad: t.replace(',', '.').replace(/[^\d.]/g, '')})}
                                        style={{borderWidth:1, borderColor: err('cantidad')? danger: colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:6}}
                                    />
                                    {err('cantidad') && <Text style={[g.text.caption, {color: danger, marginTop:4}]}>Ingrese un número válido.</Text>}
                                </View>

                                <View style={{marginTop:8}}>
                                    <Text style={g.text.bodyStrong}>Fecha solicitud *</Text>
                                    <TextInput
                                        placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedText}
                                        value={val.fecha ?? ''} onChangeText={(t)=>setItem(def.n, {fecha:t})}
                                        style={{borderWidth:1, borderColor: err('fecha')? danger: colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:6}}
                                    />
                                    {err('fecha') && <Text style={[g.text.caption, {color: danger, marginTop:4}]}>Campo obligatorio.</Text>}
                                </View>

                                <View style={{marginTop:8}}>
                                    <Text style={g.text.bodyStrong}>Observaciones</Text>
                                    <TextInput
                                        placeholder="Observaciones…" placeholderTextColor={colors.mutedText}
                                        value={val.observacion ?? ''} onChangeText={(t)=>setItem(def.n, {observacion: t})}
                                        style={styles.obsInput}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>
            );
        }

        // PRUEBAS u otros (horizontal extendido)
        return (
            <>
                <SectionHeaderRow cols={cols}/>
                <View style={styles.hSep}/>
                {defs.map((def, idxRow)=>{
                    const fallback: ItemValor = { n: def.n, valor:null, estado:null, observacion:'', __selectorAuto: def.selector };
                    const val = itemsVals.find(x=>x.n===def.n) ?? fallback;
                    const zebra = (idxRow % 2 === 0) ? {backgroundColor: colors.mutedBg} : null;
                    const selType = valorSelectorFor(def);
                    const errValor = errorSet.has(`item:${def.n}:valor`);
                    const errEstado = errorSet.has(`item:${def.n}:estado`);

                    return (
                        <View key={def.n} style={[{borderRadius:10, padding:10, marginBottom:10}, zebra]}>
                            <View style={{marginVertical:6}}>
                                <Text style={g.text.body}>{def.texto}{def.required ? ' *' : ''}</Text>
                                {!!def.responsable && <Text style={[g.text.caption, { color: colors.mutedText, marginTop: 2 }]}>Responsable: {def.responsable}</Text>}
                            </View>

                            <View style={{flexDirection:'row', alignItems:'center', gap:8}}>
                                {!hideItemNumber && (
                                    <View style={{width:46}}>
                                        <View style={styles.cellBadge}>
                                            <Text style={[g.text.caption, {fontWeight:'700'}]}>{def.n}</Text>
                                        </View>
                                    </View>
                                )}

                                {hasValor && (
                                    <View style={{flex:2}}>
                                        {selType==='brm' && (
                                            <BRMSeg value={(val.valor as any) ?? null} onChange={(v)=>setItem(def.n, {valor:v})} colors={colors} error={errValor}/>
                                        )}
                                        {selType==='brmna' && (
                                            <BRMNASeg value={(val.valor as any) ?? null} onChange={(v)=>setItem(def.n, {valor:v})} colors={colors} error={errValor}/>
                                        )}
                                        {selType==='sino' && (
                                            <SiNoToggle value={(val.valor as any) ?? null} onChange={(v)=>setItem(def.n, {valor:v})} colors={colors} error={errValor}/>
                                        )}
                                        {isNumericSelector(selType) && (
                                            <View style={{flexDirection:'row', alignItems:'center', gap:8, alignSelf:'center'}}>
                                                {!!(selType==='volts' || selType==='ohms') && <Text style={g.text.body}>{unitLabel(selType)}</Text>}
                                                <TextInput
                                                    keyboardType="numeric"
                                                    value={val.valor!=null ? String(val.valor): ''}
                                                    onChangeText={(t)=>setItem(def.n, {valor: t.replace(',', '.').replace(/[^\d.]/g, '')})}
                                                    placeholder={selType==='qty' ? '-' : '____'} placeholderTextColor={colors.mutedText}
                                                    style={{minWidth:90, borderWidth:1, borderColor: errValor? danger: colors.divider, borderRadius:8, paddingVertical:6, paddingHorizontal:10, color: colors.text, textAlign:'center'}}
                                                />
                                            </View>
                                        )}
                                        {selType==='combo' && (
                                            <ComboBox
                                                value={(val.valor as string) ?? null}
                                                onChange={(v)=>setItem(def.n, {valor:v})}
                                                options={valorOptionsFor()}
                                                placeholder="Selección…" colors={colors} error={errValor}
                                            />
                                        )}
                                    </View>
                                )}

                                {otherCols.map(c=>{
                                    const raw = (val as any)?.[c.key];
                                    const isErr = errorSet.has(`item:${def.n}:${c.key}`);
                                    return (
                                        <View key={c.key} style={{flex:1}}>
                                            {c.selectorType==='combo' ? (
                                                <ComboBox value={raw ?? null} onChange={(v)=>setItem(def.n, {[c.key]: v})} options={c.options || []}
                                                          placeholder={c.label || 'Seleccione…'} colors={colors} error={isErr}/>
                                            ) : c.selectorType==='sino' ? (
                                                <SiNoToggle value={(raw ?? null) as 'SI'|'NO'|null} onChange={(v)=>setItem(def.n, {[c.key]: v})} colors={colors} error={isErr}/>
                                            ) : (
                                                <TextInput
                                                    placeholder={c.label || c.key} placeholderTextColor={colors.mutedText}
                                                    value={raw ?? ''} onChangeText={(t)=>setItem(def.n, {[c.key]: t})}
                                                    style={{borderWidth:1, borderColor: isErr? danger: colors.divider, borderRadius:8, paddingVertical:6, paddingHorizontal:10, color: colors.text}}
                                                />
                                            )}
                                        </View>
                                    );
                                })}

                                {extraQty.map((c)=>{
                                    const key = c.key;
                                    const raw = (val as any)?.[key];
                                    const isErr = errorSet.has(`item:${def.n}:${key}`);
                                    return (
                                        <View key={key} style={{width:90}}>
                                            <TextInput
                                                keyboardType="numeric"
                                                value={raw!=null ? String(raw): ''}
                                                onChangeText={(t)=>setItem(def.n, {[key]: t.replace(',', '.').replace(/[^\d.]/g, '')})}
                                                placeholder="-" placeholderTextColor={colors.mutedText}
                                                style={{borderWidth:1, borderColor: isErr? danger: colors.divider, borderRadius:8, paddingVertical:6, paddingHorizontal:10, color: colors.text, textAlign:'center'}}
                                            />
                                        </View>
                                    );
                                })}

                                {hasEstado && (
                                    <View style={{width:56, alignItems:'center'}}>
                                        <ACToggle value={val.estado ?? null} onChange={(v)=>setItem(def.n, {estado:v})} colors={colors} error={errEstado}/>
                                    </View>
                                )}
                            </View>

                            {showObs && (
                                <View style={{marginTop:8}}>
                                    <Text style={g.text.bodyStrong}>{obsLabel}</Text>
                                    <TextInput
                                        placeholder={obsPlaceholder} placeholderTextColor={colors.mutedText}
                                        value={val.observacion ?? ''} onChangeText={(t)=>setItem(def.n, {observacion:t})}
                                        style={styles.obsInput}
                                    />
                                </View>
                            )}
                        </View>
                    );
                })}
            </>
        );
    };

    const renderFirmas = () => {
        const firmasSchema = meta?.schema?.firmas || null;
        if (!firmasSchema) return null;

        const InputForPrimitive = ({label, type, value, onChange, isErr, placeholder}:{label:string, type:PrimitiveField['type'], value:any, onChange:(v:any)=>void, isErr?:boolean, placeholder?:string}) => {
            if (type==='textarea') {
                return (
                    <View style={{marginTop:8}}>
                        <Text style={g.text.bodyStrong}>{label}</Text>
                        <TextInput multiline placeholder={placeholder || label} placeholderTextColor={colors.mutedText} value={value ?? ''} onChangeText={onChange}
                                   style={{borderWidth:1, borderColor: isErr? danger: colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:8, minHeight:100, textAlignVertical:'top'}}/>
                        {isErr && <Text style={[g.text.caption, {color: danger, marginTop:4}]}>Campo obligatorio.</Text>}
                    </View>
                );
            }
            if (type==='number') {
                return (
                    <View style={{marginTop:8}}>
                        <Text style={g.text.bodyStrong}>{label}</Text>
                        <TextInput keyboardType="numeric" placeholder={placeholder || label} placeholderTextColor={colors.mutedText}
                                   value={value!=null ? String(value): ''} onChangeText={(t)=>onChange(t.replace(',', '.').replace(/[^\d.]/g,''))}
                                   style={{borderWidth:1, borderColor: isErr? danger: colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:8}}/>
                        {isErr && <Text style={[g.text.caption, {color: danger, marginTop:4}]}>Campo obligatorio.</Text>}
                    </View>
                );
            }
            return (
                <View style={{marginTop:8}}>
                    <Text style={g.text.bodyStrong}>{label}</Text>
                    <TextInput placeholder={placeholder || label} placeholderTextColor={colors.mutedText}
                               value={value ?? ''} onChangeText={onChange}
                               style={{borderWidth:1, borderColor: isErr? danger: colors.divider, borderRadius:10, padding:10, color: colors.text, marginTop:8}}/>
                    {isErr && <Text style={[g.text.caption, {color: danger, marginTop:4}]}>Campo obligatorio.</Text>}
                </View>
            );
        };

        return (
            <View style={{marginTop:20, marginBottom:6}}>
                <Text style={[g.text.h2]}>Firmas</Text>
                {Object.entries(firmasSchema).map(([bloqueKey, bloqueCfg]: any)=>{
                    const titulo = bloqueCfg?.title || humanTitle(bloqueKey);
                    const fields = bloqueCfg?.fields || {};
                    const vals = firmasVals?.[bloqueKey] || {};
                    return (
                        <View key={bloqueKey} style={{marginTop:12, padding:12, borderWidth:1, borderColor: colors.divider, borderRadius:12, backgroundColor: colors.card}}>
                            <Text style={[g.text.h3]}>{titulo}</Text>
                            {Object.entries(fields).map(([fk, fdef]: any)=>{
                                const isErr = showChecklistErrors && errorSet.has(`firmas:${bloqueKey}:${fk}`);
                                return (
                                    <InputForPrimitive
                                        key={fk}
                                        label={`${fdef?.label || humanTitle(fk)}${fdef?.required ? ' *' : ''}`}
                                        type={(fdef?.type || 'text') as PrimitiveField['type']}
                                        value={vals?.[fk]}
                                        onChange={(v:any)=>setFirmasVals((prev:any)=>({...prev, [bloqueKey]: {...(prev?.[bloqueKey] || {}), [fk]: v}}))}
                                        isErr={isErr}
                                        placeholder={fdef?.type==='file' ? `${fdef?.label || humanTitle(fk)} (jpg/png)`: (fdef?.label || humanTitle(fk))}
                                    />
                                );
                            })}
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <ScrollView>
            {/* Encabezado */}
            {renderHeader()}

            {/* Grupos */}
            <View style={{marginTop:18}}>
                {Object.entries(grupos).map(([nombreGrupo, defs])=>(
                    <View key={nombreGrupo} style={{marginBottom:12}}>
                        <View style={[styles.sectionHeader, {backgroundColor: colors.cardTint}]}>
                            <Text style={styles.sectionTitle}>{nombreGrupo}</Text>
                            <View style={styles.sectionBar}/>
                        </View>
                        {renderGroup(nombreGrupo, defs)}
                    </View>
                ))}
            </View>

            {/* Firmas */}
            {renderFirmas()}

            {/* Enviar */}
            <Pressable
                onPress={enviar}
                style={{marginTop:18, paddingVertical:14, paddingHorizontal:28, backgroundColor: checklistOK? colors.primary: colors.divider, borderRadius:999, alignSelf:'center', opacity: checklistOK? 1: 0.6, marginBottom:24}}
            >
                <Text style={{color: checklistOK? '#fff': colors.mutedText, fontWeight:'700'}}>
                    {checklistOK ? 'Enviar formulario' : 'Completa los campos obligatorios'}
                </Text>
            </Pressable>
        </ScrollView>
    );
}
