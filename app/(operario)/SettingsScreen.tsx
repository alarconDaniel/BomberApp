// app/(operario)/SettingsScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    Pressable,
    Modal,
    ScrollView,
    SafeAreaView,
    Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import FadeWrapper from '../../components/FadeWrapper';
import FooterOperario from '../../components/FooterOperario';
import { useAuth } from '../../auth/AuthContext';
import {router} from "expo-router";

export default function SettingsScreen() {
    const { logout, user } = useAuth();
    const [notif, setNotif] = useState(true);
    const [sounds, setSounds] = useState(true);
    const [dark, setDark] = useState(false);
    const [policyOpen, setPolicyOpen] = useState(false);

    return (
        <FadeWrapper>
            <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.title}>Configuración</Text>

                    {/* --------- Experiencia de la app --------- */}
                    <Section title="Experiencia de la app">
                        <SettingRow
                            icon={<Ionicons name="notifications-outline" size={22} />}
                            label="Notificaciones"
                            right={
                                <Switch
                                    value={notif}
                                    onValueChange={setNotif}
                                    trackColor={{ false: '#c7d2fe', true: COLORS.primarySoft }}
                                    thumbColor={notif ? COLORS.primary : '#fff'}
                                />
                            }
                            subtitle="Avisos de actividad y recordatorios"
                        />

                        <Divider />

                        <SettingRow
                            icon={<Ionicons name="volume-high-outline" size={22} />}
                            label="Sonidos de la app"
                            right={
                                <Switch
                                    value={sounds}
                                    onValueChange={setSounds}
                                    trackColor={{ false: '#c7d2fe', true: COLORS.primarySoft }}
                                    thumbColor={sounds ? COLORS.primary : '#fff'}
                                />
                            }
                            subtitle="Efectos y tonos dentro de la app"
                        />

                        <Divider />

                        <SettingRow
                            icon={
                                dark ? (
                                    <Ionicons name="moon" size={22} />
                                ) : (
                                    <Ionicons name="sunny-outline" size={22} />
                                )
                            }
                            label="Modo oscuro"
                            right={
                                <View style={styles.darkRight}>
                                    {/* iconito que cambia según el estado */}
                                    {dark ? (
                                        <Ionicons name="moon" size={18} style={{ marginRight: 8 }} />
                                    ) : (
                                        <Ionicons name="sunny" size={18} style={{ marginRight: 8 }} />
                                    )}
                                    <Switch
                                        value={dark}
                                        onValueChange={setDark}
                                        trackColor={{ false: '#c7d2fe', true: COLORS.primarySoft }}
                                        thumbColor={dark ? COLORS.primary : '#fff'}
                                    />
                                </View>
                            }
                            subtitle={dark ? 'Oscuro como mi humor antes del café' : 'Clarito y radiante ☀️'}
                        />
                    </Section>

                    {/* --------- Otros --------- */}
                    <Section title="Otros">
                        <Pressable onPress={() => router.push('/(modals)/privacy')}>
                            <SettingRow
                                icon={<MaterialCommunityIcons name="shield-check-outline" size={22} />}
                                label="Política de privacidad"
                                right={<Ionicons name="chevron-forward" size={18} />}
                            />
                        </Pressable>

                        <Divider />

                        <Pressable
                            onPress={() => Alert.alert('Reseñas', 'Esta función vendrá pronto 🛠️')}
                        >
                            <SettingRow
                                icon={<Ionicons name="star-outline" size={22} />}
                                label="Reseñar App"
                                right={<Ionicons name="chevron-forward" size={18} />}
                            />
                        </Pressable>

                        <Divider />

                        <Pressable
                            onPress={async () => {
                                try {
                                    await logout();                 // borra tokens y usuario (cliente)
                                } catch {
                                    Alert.alert('Ups', 'No pudimos cerrar sesión. Intenta de nuevo.');
                                }
                            }}
                        >
                            <SettingRow
                                icon={<MaterialCommunityIcons name="logout" size={22} />}
                                label="Cerrar sesión"
                                right={<Ionicons name="exit-outline" size={18} />}
                                danger
                                subtitle={user?.email ? `Sesión de ${user.email}` : undefined}
                            />
                        </Pressable>
                    </Section>

                    <View style={{ height: 32 }} />
                </ScrollView>

            </SafeAreaView>

            {/* --------- Modal Política de Privacidad --------- */}
            <Modal
                visible={policyOpen}
                animationType="slide"
                onRequestClose={() => setPolicyOpen(false)}
                transparent
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="shield-account" size={22} />
                            <Text style={[styles.modalTitle, { marginLeft: 8 }]}>
                                Política de privacidad
                            </Text>
                        </View>
                        <ScrollView style={{ marginTop: 12 }}>
                            <Text style={styles.modalText}>
                                Esta aplicación respeta tu privacidad. Recopilamos solo la información
                                necesaria para operar el servicio (por ejemplo, datos de cuenta y uso
                                básico). No vendemos tus datos a terceros. Podemos usar información
                                agregada y anonimizada para mejorar la experiencia. Puedes solicitar
                                acceso, rectificación o eliminación de tus datos escribiéndonos.
                                El uso de la app implica la aceptación de esta política. Esta es
                                una versión de ejemplo que podrás reemplazar por la definitiva.
                            </Text>
                        </ScrollView>
                        <Pressable style={styles.modalBtn} onPress={() => setPolicyOpen(false)}>
                            <Ionicons name="checkmark-circle-outline" size={18} />
                            <Text style={styles.modalBtnText}>Entendido</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </FadeWrapper>
    );
}

/* ---------- helpers de UI ---------- */

const COLORS = {
    bg: '#0f172a',             // slate-900
    card: '#111827',           // gray-900
    cardTint: '#0b1220',
    text: '#e5e7eb',           // gray-200
    sub: '#a5b4fc',            // indigo-200
    primary: '#7c3aed',        // violet-600
    primarySoft: '#c4b5fd',    // violet-300
    divider: 'rgba(255,255,255,0.08)',
    danger: '#ef4444',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.card}>{children}</View>
        </View>
    );
}

function Divider() {
    return <View style={styles.divider} />;
}

function SettingRow({
                        icon,
                        label,
                        right,
                        subtitle,
                        danger,
                    }: {
    icon: React.ReactNode;
    label: string;
    right?: React.ReactNode;
    subtitle?: string;
    danger?: boolean;
}) {
    return (
        <View style={styles.row}>
            <View style={styles.iconWrap}>{icon}</View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.label, danger && { color: COLORS.danger }]}>{label}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {right}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: COLORS.bg },
    title: { color: COLORS.text, fontSize: 24, fontWeight: '700', marginBottom: 12 },
    section: { marginTop: 12 },
    sectionTitle: { color: COLORS.sub, marginBottom: 8, fontWeight: '600' },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    row: {
        minHeight: 60,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    iconWrap: {
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: COLORS.cardTint,
        borderWidth: 1,
        borderColor: COLORS.divider,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    label: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
    subtitle: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.divider },
    darkRight: { flexDirection: 'row', alignItems: 'center' },

    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: COLORS.card,
        padding: 16,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: COLORS.divider,
    },
    modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
    modalText: { color: '#e5e7eb', lineHeight: 20 },
    modalBtn: {
        marginTop: 16,
        alignSelf: 'flex-end',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: COLORS.primary,
    },
    modalBtnText: { color: 'white', fontWeight: '700', marginLeft: 6 },
});
