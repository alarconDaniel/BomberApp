// app/(modals)/privacy.tsx
import React from 'react';
import { View, Text, Pressable, SafeAreaView, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';


export default function PrivacyModal() {
    const router = useRouter();

    const s = StyleSheet.create({
        safe: { flex: 1, backgroundColor: "#f8fafc" },
        headerRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
        backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        backTxt: { fontSize: 16},
        content: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
        title: { textAlign: 'center', fontSize: 28, fontWeight: 'bold', marginTop: 24},
        card: {
            marginTop: 20,
            backgroundColor: "#ffffff",
            borderRadius: 14,
            padding: 16,
            borderWidth: 1,
            borderColor: "rgba(15,23,42,0.08)",
            width: '100%',
        },
        text: { opacity: 0.9, lineHeight: 22 },
        primaryBtn: {
            marginTop: 'auto',
            marginBottom: 24,
            paddingVertical: 14,
            paddingHorizontal: 28,
            backgroundColor: "#7c3aed",
            borderRadius: 999,
        },
        primaryBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
    });

    return (
        <SafeAreaView style={s.safe}>
            {/* Header: volver */}
            <View style={s.headerRow}>
                <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
                    <FontAwesome5 name="chevron-left" size={18} />
                    <Text style={s.backTxt}>Volver</Text>
                </Pressable>
            </View>

            <View style={s.content}>
                <Text style={s.title}>Política de privacidad</Text>

                <View style={s.card}>
                    <ScrollView>
                        <Text style={s.text}>
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
                    <Text style={s.primaryBtnTxt}>Entendido</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
