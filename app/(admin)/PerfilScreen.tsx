// app/(admin)/(tabs)/PerfilScreen.tsx
import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import FadeWrapper from '../../components/FadeWrapper';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';

const AVATAR = 96;

function initials(name?: string) {
  const s = (name ?? '').trim();
  if (!s) return '👤';
  const parts = s.split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts[1]?.[0] ?? '';
  return (a + b).toUpperCase();
}
function fromEmail(email?: string | null) {
  if (!email) return undefined;
  const local = email.split('@')[0];
  return local.replace(/[._-]+/g, ' ');
}
function toTitle(s?: string) {
  if (!s) return '';
  return s
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function PerfilScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const { colors, scheme, setScheme, isDark } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);

  // Nombre derivado del email (ya que user no trae displayName)
  const displayName = toTitle(fromEmail(user?.email)) || 'Administrador';

  // animación sutil del avatar
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

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login'); // ajusta si tu ruta de login es distinta
  };

  return (
    <FadeWrapper>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Header simple */}
        <View style={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4 }}>
          <Text style={g.text.h2}>Mi perfil</Text>
        </View>

        {/* Tarjeta principal */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.tabBorder, shadowColor: colors.tabBorder },
          ]}
        >
          {/* Avatar + nombre */}
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
          <Text style={[g.text.small, g.text.muted]}>{user?.email ?? '—'}</Text>

          {/* Fila de info */}
          <View style={styles.infoRow}>
            <InfoChip
              icon="id-card-outline"
              label="Rol"
              value={String(user?.rol ?? '—')}
              colors={colors}
              g={g}
            />
            <InfoChip
              icon="finger-print-outline"
              label="ID"
              value={String(user?.id ?? '—')}
              colors={colors}
              g={g}
            />
          </View>

          {/* Acciones rápidas */}
          <View style={styles.actionsRow}>
            <ActionButton
              icon="create-outline"
              label="Editar perfil"
              onPress={() => router.push('/(modals)/editar-perfil')}
              colors={colors}
              g={g}
            />
            <ActionButton
              icon={isDark ? 'moon' : 'sunny'}
              label={isDark ? 'Oscuro' : 'Claro'}
              onPress={() => setScheme(scheme === 'dark' ? 'light' : 'dark')}
              colors={colors}
              g={g}
            />
          </View>
        </View>

        {/* Card secundaria: datos disponibles */}
        <View
          style={[
            styles.secondary,
            { backgroundColor: colors.cardTint, borderColor: colors.tabBorder },
          ]}
        >
          <Row label="Correo" value={user?.email ?? '—'} g={g} />
          <Row label="ID de usuario" value={String(user?.id ?? '—')} g={g} />
          <Row label="Rol" value={String(user?.rol ?? '—')} g={g} />
        </View>

        {/* Botón salir */}
        <Pressable
          onPress={onLogout}
          style={[styles.logoutBtn, { backgroundColor: colors.danger }]}
        >
          <Ionicons name="log-out-outline" color="#fff" size={18} />
          <Text style={[g.text.onPrimary, { marginLeft: 8 }]}>Cerrar sesión</Text>
        </Pressable>
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------- Subcomponentes ---------- */
function InfoChip({
  icon,
  label,
  value,
  colors,
  g,
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
  icon,
  label,
  onPress,
  colors,
  g,
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

/* ---------- Estilos base ---------- */
const styles = StyleSheet.create({
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
  logoutBtn: {
    marginTop: 18,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
  },
});
