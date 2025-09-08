import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Switch, Pressable, Modal, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import FadeWrapper from '../../../components/admin/FadeWrapper';
import { useAuth } from '../../../auth/AuthContext';
import { router } from 'expo-router';
import { useTheme } from '../../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../../theme/GlobalStyles';

const FOOTER_HEIGHT = 84; // espacio para el tab bar

export default function SettingsScreen() {
  const { logout, user } = useAuth();
  const { colors, isDark, setScheme, scheme } = useTheme();
  const { text } = useMemo(() => makeGlobalStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const [notif, setNotif] = useState(true);
  const [sounds, setSounds] = useState(true);
  const [themeOpen, setThemeOpen] = useState(false);

  const s = useMemo(() => makeStyles(colors), [colors]);
  const schemeLabel = scheme === 'system' ? 'Sistema' : isDark ? 'Oscuro' : 'Claro';

  // 👇 evita doble tap y asegura desmontar tabs antes de que disparen efectos
  const loggingOutRef = useRef(false);
  const handleLogout = async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    try {
      await logout();                   // limpia tokens/usuario (AuthContext)
      router.replace('/(auth)/login');  // desmonta tabs inmediatamente → sin efectos rezagados
    } catch (e: any) {
      Alert.alert('Ups', e?.message || 'No pudimos cerrar sesión. Intenta de nuevo.');
    } finally {
      loggingOutRef.current = false;
    }
  };

  return (
    <FadeWrapper>
      {/* 👇 wrapper con bg para cubrir toda la pantalla */}
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.bg }}
          contentContainerStyle={{
            paddingTop: (insets.top || 0) + 8,
            paddingHorizontal: 16,
            paddingBottom: FOOTER_HEIGHT + 24,
            backgroundColor: colors.bg,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[text.h1, s.titlePad]}>Configuración</Text>

          {/* --------- Experiencia de la app --------- */}
          <Section title="Experiencia de la app" colors={colors} text={text}>
            <SettingRow
              colors={colors}
              text={text}
              icon={<Ionicons name="notifications-outline" size={22} color={colors.text} />}
              label="Notificaciones"
              right={
                <Switch
                  value={notif}
                  onValueChange={setNotif}
                  trackColor={{ false: '#dbeafe', true: colors.primarySoft }}
                  thumbColor={notif ? colors.primary : '#fff'}
                />
              }
              subtitle="Avisos de actividad y recordatorios"
            />

            <Divider colors={colors} />

            <SettingRow
              colors={colors}
              text={text}
              icon={<Ionicons name="volume-high-outline" size={22} color={colors.text} />}
              label="Sonidos de la app"
              right={
                <Switch
                  value={sounds}
                  onValueChange={setSounds}
                  trackColor={{ false: '#dbeafe', true: colors.primarySoft }}
                  thumbColor={sounds ? colors.primary : '#fff'}
                />
              }
              subtitle="Efectos y tonos dentro de la app"
            />

            <Divider colors={colors} />

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

            <Pressable onPress={handleLogout}>
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
        </ScrollView>
      </View>

      {/* Modal de tema */}
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
type Palette = import('../../../theme/ThemeProvider').Palette;
type TextVariants = ReturnType<typeof makeGlobalStyles>['text'];

function Section({ title, children, colors, text }:{
  title: string; children: React.ReactNode; colors: Palette; text: TextVariants;
}) {
  const s = makeStyles(colors);
  return (
    <View style={s.section}>
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
  icon: React.ReactNode; label: string; right?: React.ReactNode; subtitle?: string;
  danger?: boolean; colors: Palette; text: TextVariants;
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
}:{
  colors: Palette; text: TextVariants; active: boolean; icon: React.ReactNode;
  label: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 12,
        borderRadius: 12, borderWidth: 1,
        borderColor: active ? colors.primary : colors.divider,
        backgroundColor: pressed ? colors.cardTint : colors.card,
        marginTop: 10,
      }]}
    >
      <View style={{ width: 28, alignItems: 'center' }}>{icon}</View>
      <Text style={[text.bodyStrong, { flex: 1, marginLeft: 8 }]}>{label}</Text>
      {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { backgroundColor: c.bg },
    titlePad: { marginBottom: 12 },

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
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 16, borderTopWidth: 1, borderColor: c.divider, paddingBottom: 60,
    },
  });
