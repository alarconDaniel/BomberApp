// components/admin/reto/ArchivoRetoEditor.tsx
import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';
import { EditorHandle } from './types';

const FORM_TYPES = ['pdf', 'jpg', 'png', 'docx', 'mp4', 'mov', 'heif', 'heic', 'xslx', 'webp'] as const;
type FormType = typeof FORM_TYPES[number];

export type ArchivoEditorProps = {
    colors: any;
    g: ReturnType<typeof makeGlobalStyles>;
    initialConfig?: any; // { kind:'archivo', instrucciones:string, tiposPermitidos:FormType[] }
};

const toFormType = (v: any): FormType | null => {
    const s = String(v).toLowerCase() as FormType;
    return (FORM_TYPES as readonly FormType[]).includes(s) ? s : null;
};

const ArchivoRetoEditor = forwardRef<EditorHandle, ArchivoEditorProps>(
    ({ colors, g, initialConfig }, ref) => {
        const [instr, setInstr] = useState<string>(() => String(initialConfig?.instrucciones ?? ''));
        const [allowed, setAllowed] = useState<FormType[]>(() => {
            const fromCfg = Array.isArray(initialConfig?.tiposPermitidos)
                ? initialConfig.tiposPermitidos.map(toFormType).filter((x:any): x is FormType => !!x)
                : [];
            return fromCfg.length ? fromCfg : ['pdf'];
        });

        useImperativeHandle(
            ref,
            () => ({
                validate() {
                    return instr.trim().length > 0 && allowed.length > 0;
                },
                getConfig() {
                    return {
                        kind: 'archivo',
                        instrucciones: instr.trim(),
                        tiposPermitidos: allowed,
                    };
                },
            }),
            [instr, allowed]
        );

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
                    chipBase: {
                        paddingHorizontal: 12,
                        height: 34,
                        borderRadius: 16,
                        borderWidth: 1,
                        justifyContent: 'center' as const,
                        alignSelf: 'flex-start' as const,
                    },
                    chipOn: {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                    },
                    chipOff: {
                        backgroundColor: colors.mutedBg,
                        borderColor: colors.outline,
                    },
                    hint: {
                        marginTop: 6,
                        color: colors.mutedText,
                    },
                }),
            [colors]
        );

        return (
            <View>
                <Text style={[g.text.smallStrong, { marginTop: 16 }]}>Instrucciones</Text>
                <TextInput
                    value={instr}
                    onChangeText={setInstr}
                    placeholder="Describe qué debe subir el usuario (ej: reporte en PDF con fotos, etc.)"
                    placeholderTextColor={colors.mutedText}
                    style={[s.input, { marginTop: 6 }]}
                />

                <Text style={[g.text.smallStrong, { marginTop: 12 }]}>Tipos de archivo permitidos</Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {FORM_TYPES.map((t) => {
                        const selected = allowed.includes(t);
                        return (
                            <Pressable
                                key={t}
                                onPress={() =>
                                    setAllowed((prev) => {
                                        const next = selected ? prev.filter((x) => x !== t) : [...prev, t];
                                        return next as FormType[];
                                    })
                                }
                                style={[s.chipBase, selected ? s.chipOn : s.chipOff]}
                            >
                                <Text style={selected ? g.text.onPrimary : g.text.smallStrong}>
                                    {t.toUpperCase()}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                <Text style={[g.text.caption, s.hint]}>
                    Se guarda en <Text style={g.text.captionStrong}>retos.metadata_reto</Text> como <Text style={g.text.captionStrong}>{`{ kind:'archivo', instrucciones, tiposPermitidos }`}</Text>.
                </Text>
            </View>
        );
    }
);

export default ArchivoRetoEditor;
