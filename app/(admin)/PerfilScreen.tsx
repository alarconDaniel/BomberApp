// app/(admin)/(tabs)/PerfilScreen.tsx
import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import FadeWrapper from '../../components/FadeWrapper';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

const AVATAR = 96;

/* helpers */
function initials(name?: string) {
  const s = (name ?? '').trim();
  if (!s) return '👤';
  const [a, b] = s.split(/\s+/);
  return ((a?.[0] ?? '') + (b?.[0] ?? '')).toUpperCase();
}
function fromEmail(email?: string | null) {
  if (!email) return undefined;
  return email.split('@')[0].replace(/[._-]+/g, ' ');
}
function toTitle(s?: string) {
  if (!s) return '';
  return s.trim().split(/\s+/).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

export default function PerfilScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);

  const displayName = toTitle(fromEmail(user?.email)) || 'Administrador';
  const rolLabel = (() => {
    const r: any = user?.rol ?? (user as any)?.codRol;
    if (typeof r === 'number') return r === 1 ? 'admin' : 'operario';
    return (r ? String(r) : '—').toLowerCase();
  })();
  const cedula =
    (user as any)?.cedula ??
    (user as any)?.cedulaUsuario ??
    (user as any)?.cedula_usuario ??
    '—';

  // animación avatar
  const pulse = useRef(new Animated.Value(0)).current;
  const onPressAvatar = () => {
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };
  const avatarStyle = {
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] }) }],
  };

  return (
    <FadeWrapper>
      {/* 👇 SafeAreaView de safe-area-context para evitar que se meta bajo la status bar */}
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 18,
            paddingTop: 6,
            paddingBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={g.text.h2}>Mi perfil</Text>

          <Pressable
            onPress={() => router.push('/(admin)/(tabs)/SettingsScreen')}
            hitSlop={8}
            style={({ pressed }) => [
              styles.settingsBtn,
              {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
                shadowColor: colors.primary,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            <Ionicons name="settings-sharp" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Tarjeta principal */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.tabBorder, shadowColor: colors.tabBorder },
          ]}
        >
          <Pressable onPress={onPressAvatar} style={{ alignItems: 'center' }}>
            <Animated.View
              style={[
                {
                  width: AVATAR,
                  height: AVATAR,
                  borderRadius: AVATAR / 2,
                  backgroundColor: colors.brandBlueSoft,
                  borderWidth: 3,
                  borderColor: colors.brandBlueBorder,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                avatarStyle,
              ]}
            >
              <Text style={{ fontSize: 36, fontWeight: '800', color: colors.primary }}>
                {initials(displayName)}
              </Text>
            </Animated.View>
          </Pressable>

          <Text style={[g.text.h3, { marginTop: 10 }]}>{displayName}</Text>
          <Text style={[g.text.small, g.text.muted]}>{user?.email || '—'}</Text>

          {/* Fila de info */}
          <View style={styles.infoRow}>
            <InfoChip icon="id-card-outline" label="Rol" value={rolLabel} colors={colors} g={g} />
            <InfoChip icon="finger-print-outline" label="Cédula" value={String(cedula)} colors={colors} g={g} />
          </View>

          {/* Acción rápida */}
          <View style={styles.actionsRow}>
            <ActionButton
              icon="create-outline"
              label="Editar perfil"
              onPress={() => router.push('/(modals)/editar-perfil')}
              colors={colors}
              g={g}
            />
          </View>
        </View>

        {/* Card secundaria */}
        <View
          style={[
            styles.secondary,
            { backgroundColor: colors.cardTint, borderColor: colors.tabBorder },
          ]}
        >
          <Row label="Correo" value={user?.email || '—'} g={g} />
          <Row label="Cédula" value={String(cedula)} g={g} />
          <Row label="Rol" value={rolLabel} g={g} />
        </View>
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* subcomponentes */
function InfoChip({
  icon, label, value, colors, g,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
  g: ReturnType<typeof makeGlobalStyles>;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.mutedBg,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.outline,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={icon} size={18} color={colors.tabIconActive} />
        <Text style={[g.text.smallStrong, { marginLeft: 8 }]}>{label}</Text>
      </View>
      <Text style={[g.text.body, { marginTop: 4 }]}>{value}</Text>
    </View>
  );
}

function ActionButton({
  icon, label, onPress, colors, g,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: any;
  g: ReturnType<typeof makeGlobalStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        flexDirection: 'row',
      }}
    >
      <Ionicons name={icon} size={18} color="#fff" />
      <Text style={[g.text.onPrimary, { marginLeft: 8 }]}>{label}</Text>
    </Pressable>
  );
}

function Row({ label, value, g }: { label: string; value: string; g: ReturnType<typeof makeGlobalStyles> }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={[g.text.small, g.text.muted]}>{label}</Text>
      <Text style={g.text.bodyStrong}>{value}</Text>
    </View>
  );
}

/* estilos */
const styles = StyleSheet.create({
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  card: {
    marginHorizontal: 18,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  infoRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 8 },
  actionsRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 10 },
  secondary: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
