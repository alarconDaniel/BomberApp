// components/admin/reto/EditorPrimitives.tsx
import React from 'react';
import { Pressable, Text, View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';

export function Radio({
                          label, selected, onPress, c, g,
                      }: { label: string; selected: boolean; onPress: () => void; c: any; g: ReturnType<typeof makeGlobalStyles>; }) {
    return (
        <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selected ? c.primary : c.inputBorder, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} /> : null}
            </View>
            <Text style={g.text.body}>{label}</Text>
        </Pressable>
    );
}

export function Chip({
                         label, onPress, c, g,
                     }: { label: string; onPress?: () => void; c: any; g: ReturnType<typeof makeGlobalStyles>; }) {
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[{ paddingHorizontal: 12, height: 36, borderRadius: 10, justifyContent: 'center', borderWidth: 1 }, { backgroundColor: c.mutedBg, borderColor: c.outline }]}>
            <Text style={[g.text.smallStrong]}>{label}</Text>
        </TouchableOpacity>
    );
}

export function Segment({
                            label, active, onPress, c, g, icon,
                        }:{
    label: string; active: boolean; onPress: () => void;
    c: any; g: ReturnType<typeof makeGlobalStyles>;
    icon?: keyof typeof Ionicons.glyphMap;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                { paddingHorizontal: 12, height: 34, borderRadius: 16, borderWidth: 1, justifyContent: 'center' },
                { backgroundColor: active ? c.primary : c.mutedBg, borderColor: active ? c.primary : c.outline }
            ]}
            accessibilityLabel={label}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {icon ? <Ionicons name={icon} size={14} color={active ? '#fff' : c.text} /> : null}
                <Text style={active ? g.text.onPrimary : g.text.smallStrong}>{label}</Text>
            </View>
        </Pressable>
    );
}

export function getStyles(c: any) {
    return StyleSheet.create({
        card: {
            marginHorizontal: 18,
            padding: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.tabBorder,
            backgroundColor: c.card,
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
        },
        input: {
            borderWidth: 1, borderColor: c.inputBorder, borderRadius: 10,
            paddingHorizontal: 12, height: 40, backgroundColor: c.card, color: c.text,
        },
        textAreaWrap: {
            position: 'relative', borderWidth: 1, borderColor: c.inputBorder,
            borderRadius: 10, backgroundColor: c.card,
        },
        textArea: {
            minHeight: 140, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24,
            color: c.text, textAlignVertical: 'top',
        },
        panel: {
            marginTop: 12, padding: 12, backgroundColor: c.cardTint, borderRadius: 12,
            borderWidth: 1, borderColor: c.tabBorder,
        },
        check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: c.inputBorder },
        pairRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
        addBtn: {
            marginTop: 8,
            alignSelf: 'flex-start' as const,
            paddingHorizontal: 12,
            height: 36,
            borderRadius: 10,
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: c.outline,
            backgroundColor: c.mutedBg
        },
        primaryBtn: { height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
        dateBtn: { flex: 1, height: 54, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, alignItems: 'center', flexDirection: 'row' },
    });
}

export function clampInt(v: string, min: number, max: number) {
    const n = Math.max(min, Math.min(max, parseInt(v || '0', 10) || min));
    return n;
}
