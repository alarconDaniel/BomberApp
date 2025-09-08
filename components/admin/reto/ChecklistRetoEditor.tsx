// components/admin/reto/ChecklistRetoEditor.tsx
import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';
import { ChecklistItem, EditorHandle, cryptoRandomId } from './types';

export type ChecklistEditorProps = {
    colors: any;
    g: ReturnType<typeof makeGlobalStyles>;
    initialConfig?: any; // {kind:'checklist', items:[...]}
};

const ChecklistRetoEditor = forwardRef<EditorHandle, ChecklistEditorProps>(({ colors, g, initialConfig }, ref) => {
    const [items, setItems] = useState<ChecklistItem[]>(() => {
        const parsed = Array.isArray(initialConfig?.items)
            ? initialConfig.items.map((it: any, k: number) => ({
                id: cryptoRandomId() + k,
                texto: String(it?.texto ?? ''),
                obligatorio: !!it?.obligatorio,
            }))
            : [{ id: cryptoRandomId(), texto: '', obligatorio: true }];
        return parsed.length ? parsed : [{ id: cryptoRandomId(), texto: '', obligatorio: true }];
    });

    useImperativeHandle(ref, () => ({
        validate() {
            const filled = items.filter(i => i.texto.trim()).length;
            return filled > 0;
        },
        getConfig() {
            return {
                kind: 'checklist',
                items: items
                    .filter(x => x.texto.trim())
                    .map((x, idx) => ({ numero: idx + 1, texto: x.texto.trim(), obligatorio: !!x.obligatorio })),
            };
        }
    }), [items]);

    // ✅ Usa StyleSheet.create (evita alignSelf:string)
    const s = useMemo(() => StyleSheet.create({
        input: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 12, height: 40, backgroundColor: colors.card, color: colors.text },
        check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.inputBorder },
        addBtn: {
            marginTop: 8,
            alignSelf: 'flex-start' as const,
            paddingHorizontal: 12,
            height: 36,
            borderRadius: 10,
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.outline,
            backgroundColor: colors.mutedBg
        },
    }), [colors]);

    return (
        <View>
            <Text style={[g.text.smallStrong, { marginTop: 16 }]}>Ítems del checklist</Text>
            <View style={{ marginTop: 8 }}>
                {items.map((it, idx) => (
                    <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <TextInput
                            value={it.texto}
                            onChangeText={(t) => setItems(prev => prev.map((x, i) => i === idx ? { ...x, texto: t } : x))}
                            placeholder={`Ítem ${idx + 1}`}
                            placeholderTextColor={colors.mutedText}
                            style={[s.input, { flex: 1 }]}
                        />
                        <Pressable onPress={() => setItems(prev => prev.map((x, i) => i === idx ? { ...x, obligatorio: !x.obligatorio } : x))} style={[s.check, { alignItems: 'center', justifyContent: 'center' }]}>
                            {it.obligatorio ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                        </Pressable>
                        <Text style={g.text.caption}>Oblig.</Text>
                        <Pressable onPress={() => setItems(prev => prev.filter((_, i) => i !== idx))} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="trash" size={18} color={colors.danger} />
                        </Pressable>
                    </View>
                ))}
            </View>
            <Pressable onPress={() => setItems(prev => [...prev, { id: cryptoRandomId(), texto: '', obligatorio: false }])} style={s.addBtn}>
                <Text style={g.text.bodyStrong}>Añadir ítem</Text>
            </Pressable>
        </View>
    );
});

export default ChecklistRetoEditor;
