// app/(modals)/privacy.tsx
import React from 'react';
import { View, Text, Pressable, SafeAreaView, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { markModalClosed } from '../../navigation/ModalTracker';
import { useMarkModalOnClose } from "../../navigation/useMarkModalOnClose";
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

export default function PrivacyModal() {
    const router = useRouter();
    useMarkModalOnClose();
    const { colors } = useTheme();
    const g = makeGlobalStyles(colors);

    const s = StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.bg },
        headerRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
        backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        content: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
        card: {
            marginTop: 20,
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.divider,
            width: '100%',
        },
        primaryBtn: {
            marginTop: 'auto',
            marginBottom: 24,
            paddingVertical: 14,
            paddingHorizontal: 28,
            backgroundColor: colors.primary,
            borderRadius: 999,
        },
    });

    return (
        <SafeAreaView style={s.safe}>
            {/* Header: volver */}
            <View style={s.headerRow}>
                <Pressable onPress={() => { markModalClosed(); router.back(); }} style={s.backBtn} hitSlop={10}>
                    <FontAwesome5 name="chevron-left" size={18} color={colors.text} />
                    <Text style={g.text.body}>Volver</Text>
                </Pressable>
            </View>

            <View style={s.content}>
                <Text style={[g.text.h2, { textAlign: 'center', marginTop: 24 }]}>Política de privacidad</Text>

                <View style={s.card}>
                    <ScrollView>
                        <Text style={[g.text.body, g.text.secondary, { lineHeight: 22 }]}>
                            Esta aplicación respeta tu privacidad. Recopilamos solo la información necesaria para
                            operar el servicio (por ejemplo, datos de cuenta y uso básico). No vendemos tus datos
                            a terceros. Podemos usar información agregada y anonimizada para mejorar la experiencia.
                            Puedes solicitar acceso, rectificación o eliminación de tus datos escribiéndonos. El uso
                            de la app implica la aceptación de esta política. Este texto es de ejemplo y podrás
                            reemplazarlo por la versión definitiva cuando quieras.
                        </Text>
                    </ScrollView>
                </View>

                <Pressable style={s.primaryBtn} onPress={() => router.back()}>
                    <Text style={[g.text.smallStrong, g.text.onPrimary]}>Entendido</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
