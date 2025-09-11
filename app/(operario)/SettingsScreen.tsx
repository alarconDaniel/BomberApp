// app/(operario)/SettingsScreen.tsx
import React, { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, Switch, Pressable, Modal, ScrollView, SafeAreaView, Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import FadeWrapper from '../../components/operario/FadeWrapper';
import { useAuth } from '../../auth/AuthContext';
import { router } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
// 👇 importo play y setSoundsEnabled del engine de sonido
import { play, setSoundsEnabled } from '../../utils/sound';

export default function SettingsScreen() {
    const { logout, user } = useAuth();
    const { colors, isDark, setScheme, scheme } = useTheme();
    const { text } = useMemo(() => makeGlobalStyles(colors), [colors]);

    const [notif, setNotif] = useState(true);
    const [sounds, setSounds] = useState(true);
    const [themeOpen, setThemeOpen] = useState(false);

    const s = useMemo(() => makeStyles(colors), [colors]);

    const schemeLabel = scheme === 'system' ? 'Sistema' : isDark ? 'Oscuro' : 'Claro';

    return (
        <FadeWrapper>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
                <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
                    {/* Título principal */}
                    <Text style={[text.h1, s.titlePad]}>Configuración</Text>

                    {/* --------- Experiencia de la app --------- */}
                    <Section title="Experiencia de la app" colors={colors} text={text}>
                        <SettingRow
                            colors={colors}
                            text={text}
                            icon={<Ionicons name="volume-high-outline" size={22} color={colors.text} />}
                            label="Sonidos de la app"
                            right={
                                <Switch
                                    value={sounds}
                                    onValueChange={(val) => {
                                        // 👉 reproducimos click de switch
                                        play('switch');
                                        // 👉 reflejamos en el UI state
                                        setSounds(val);
                                        // 👉 activamos/desactivamos el motor global de sonido
                                        try { setSoundsEnabled(val); } catch {}
                                    }}
                                    trackColor={{ false: '#dbeafe', true: colors.primarySoft }}
                                    thumbColor={sounds ? colors.primary : '#fff'}
                                />
                            }
                            subtitle="Efectos y tonos dentro de la app"
                        />

                        <Divider colors={colors} />

                        {/* Selector de tema (Claro/Oscuro/Sistema) */}
                        <Pressable onPress={() => setThemeOpen(true)}>
                            <SettingRow
                                colors={colors}
                                text={text}
                                icon={
                                    scheme === 'system'
                                        ? <MaterialCommunityIcons name="theme-light-dark" size={22} color={colors.text} />
                                        : isDark
                                            ? <Ionicons name="moon" size={22} color={colors.text} />
                                            : <Ionicons name="sunny-outline" size={22} color={colors.text} />
                                }
                                label="Tema"
                                right={
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[text.body, { opacity: 0.8, marginRight: 8 }]}>{schemeLabel}</Text>
                                        <Ionicons name="chevron-forward" size={18} color={colors.text} />
                                    </View>
                                }
                                subtitle="Claro, Oscuro o seguir el sistema"
                            />
                        </Pressable>
                    </Section>

                    {/* --------- Otros --------- */}
                    <Section title="Otros" colors={colors} text={text}>
                        <Pressable onPress={() => router.push('/(modals)/privacy')}>
                            <SettingRow
                                colors={colors}
                                text={text}
                                icon={<MaterialCommunityIcons name="shield-check-outline" size={22} color={colors.text} />}
                                label="Política de privacidad"
                                right={<Ionicons name="chevron-forward" size={18} color={colors.text} />}
                            />
                        </Pressable>

                        <Divider colors={colors} />

                        <Pressable onPress={() => Alert.alert('Reseñas', 'Esta función vendrá pronto 🛠️')}>
                            <SettingRow
                                colors={colors}
                                text={text}
                                icon={<Ionicons name="star-outline" size={22} color={colors.text} />}
                                label="Reseñar App"
                                right={<Ionicons name="chevron-forward" size={18} color={colors.text} />}
                            />
                        </Pressable>

                        <Divider colors={colors} />

                        <Pressable
                            onPress={async () => {
                                try { await logout(); }
                                catch { Alert.alert('Ups', 'No pudimos cerrar sesión. Intenta de nuevo.'); }
                            }}
                        >
                            <SettingRow
                                colors={colors}
                                text={text}
                                icon={<MaterialCommunityIcons name="logout" size={22} color={colors.danger} />}
                                label="Cerrar sesión"
                                right={<Ionicons name="exit-outline" size={18} color={colors.danger} />}
                                danger
                                subtitle={user?.email ? `Sesión de ${user.email}` : undefined}
                            />
                        </Pressable>
                    </Section>

                    <View style={{ height: 32 }} />
                </ScrollView>
            </SafeAreaView>

            {/* ---- Modal de selección de tema ---- */}
            <Modal visible={themeOpen} animationType="fade" transparent onRequestClose={() => setThemeOpen(false)}>
                <Pressable style={s.modalBackdrop} onPress={() => setThemeOpen(false)} />
                <View style={s.sheet}>
                    <Text style={[text.h3]}>Tema de la app</Text>

                    <ThemeOption
                        colors={colors}
                        text={text}
                        active={scheme === 'light'}
                        icon={<Ionicons name="sunny" size={18} color={colors.text} />}
                        label="Claro"
                        onPress={() => { setScheme('light'); setThemeOpen(false); }}
                    />

                    <ThemeOption
                        colors={colors}
                        text={text}
                        active={scheme === 'dark'}
                        icon={<Ionicons name="moon" size={18} color={colors.text} />}
                        label="Oscuro"
                        onPress={() => { setScheme('dark'); setThemeOpen(false); }}
                    />

                    <ThemeOption
                        colors={colors}
                        text={text}
                        active={scheme === 'system'}
                        icon={<MaterialCommunityIcons name="theme-light-dark" size={18} color={colors.text} />}
                        label="Sistema"
                        onPress={() => { setScheme('system'); setThemeOpen(false); }}
                    />
                </View>
            </Modal>
        </FadeWrapper>
    );
}

/* ---------- helpers ---------- */

type Palette = import('../../theme/ThemeProvider').Palette;
type TextVariants = ReturnType<typeof makeGlobalStyles>['text'];

function Section({
                     title, children, colors, text,
                 }: { title: string; children: React.ReactNode; colors: Palette; text: TextVariants }) {
    const s = makeStyles(colors);
    return (
        <View style={s.section}>
            {/* h2 con color de subtítulo que te gustaba en Settings */}
            <Text style={[text.h2, { color: colors.sub, marginBottom: 8 }]}>{title}</Text>
            <View style={s.card}>{children}</View>
        </View>
    );
}

function Divider({ colors }: { colors: Palette }) {
    return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.divider }} />;
}

function SettingRow({
                        icon, label, right, subtitle, danger, colors, text,
                    }: {
    icon: React.ReactNode;
    label: string;
    right?: React.ReactNode;
    subtitle?: string;
    danger?: boolean;
    colors: Palette;
    text: TextVariants;
}) {
    const s = makeStyles(colors);
    return (
        <View style={s.row}>
            <View style={s.iconWrap}>{icon}</View>
            <View style={{ flex: 1 }}>
                <Text style={[text.bodyStrong, danger && { color: colors.danger }]}>{label}</Text>
                {subtitle ? <Text style={text.caption}>{subtitle}</Text> : null}
            </View>
            {right}
        </View>
    );
}

function ThemeOption({
                         colors, text, active, icon, label, onPress,
                     }: {
    colors: Palette;
    text: TextVariants;
    active: boolean;
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
}) {
    return (
        <Pressable onPress={onPress} style={({ pressed }) => [
            {
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.divider,
                backgroundColor: pressed ? colors.cardTint : colors.card,
                marginTop: 10,
            },
        ]}>
            <View style={{ width: 28, alignItems: 'center' }}>{icon}</View>
            <Text style={[text.bodyStrong, { flex: 1, marginLeft: 8 }]}>{label}</Text>
            {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
        </Pressable>
    );
}

const makeStyles = (c: Palette) =>
    StyleSheet.create({
        container: { padding: 16, backgroundColor: c.bg },
        titlePad: { marginBottom: 12 }, // se combina con text.h1

        section: { marginTop: 12 },
        card: {
            backgroundColor: c.card,
            borderRadius: 16,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: c.divider,
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
            backgroundColor: c.cardTint,
            borderWidth: 1,
            borderColor: c.divider,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        },

        // Modal
        modalBackdrop: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.45)',
        },
        sheet: {
            position: 'absolute',
            left: 0, right: 0, bottom: 0,
            backgroundColor: c.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 16,
            borderTopWidth: 1,
            borderColor: c.divider,
            paddingBottom: 60,
        },
    });
