// app/(admin)/(tabs)/PerfilScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import FadeWrapper from '../../components/FadeWrapper';
import { useAuth } from '../../auth/AuthContext';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { fetchFullNameFromUsuariosList } from './lib/perfil'; // 👈 IMPORT NUEVO

const AVATAR = 96;

/* ---------------- helpers ---------------- */
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
  return s
    .trim()
    .split(/\s+/)
    .map(w => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Primer valor “no vacío”
function pickFirst<T = any>(...vals: T[]) {
  for (const v of vals) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s !== '' && s !== 'null' && s !== 'undefined') return s;
  }
  return undefined;
}

// Busca la cédula en distintas claves comunes (y anidadas)
function extractCedula(u: any): string {
  if (!u) return '—';
  const found = pickFirst(
    // nivel raíz
    u.cedula, u.cédula, u.cedulaUsuario, u.cedula_usuario,
    u.dni, u.documento, u.documentNumber, u.numeroDocumento, u.nroDocumento,
    u.identificacion, u.identification, u.cc,

    // común en payloads anidados
    u.usuario?.cedula, u.usuario?.cédula, u.usuario?.cedulaUsuario, u.usuario?.cedula_usuario,
    u.usuario?.dni, u.usuario?.documento, u.usuario?.numeroDocumento, u.usuario?.identificacion, u.usuario?.cc,

    // perfiles anidados
    u.perfil?.cedula, u.perfil?.dni,
    u.datos?.cedula, u.datos?.dni
  );
  return found ?? '—';
}

// Normaliza rol (1=admin) o nombre anidado
function extractRol(u: any): string {
  if (!u) return '—';
  const id = pickFirst(u.rolId, u.codRol, u.idRol, u.roleId, u.rol?.id, u.role?.id, u.usuario?.rolId, u.usuario?.codRol);
  if (id && Number(id) === 1) return 'admin';
  const name = pickFirst(
    u.rol, u.role, u.rol?.nombre, u.rol?.name, u.role?.nombre, u.role?.name,
    u.usuario?.rol, u.usuario?.role, u.usuario?.rol?.nombre
  );
  if (!name) return '—';
  const s = String(name).toLowerCase();
  return s.includes('admin') ? 'admin' : s;
}

/* ---------------- screen ---------------- */
export default function PerfilScreen() {
  const router = useRouter();
  const { user, fetchJson } = useAuth();
  const { colors } = useTheme();
  const g = useMemo(() => makeGlobalStyles(colors), [colors]);

  // 👇 Casteo local para leer propiedades opcionales sin que TS se queje
  const u = user as any;

  // === Nombre y Apellido desde /usuario/listar (con fallback) ===
  const [fullName, setFullName] = useState<string>(() =>
    toTitle(pickFirst(u?.nombre, u?.name, u?.usuario?.nombre, fromEmail(u?.email)) || 'Administrador')
  );

  const loadFullName = useCallback(async () => {
    try {
      const name = await fetchFullNameFromUsuariosList(fetchJson, u);
      if (name && name.trim()) setFullName(name);
    } catch {
      // deja el valor previo
    }
  }, [fetchJson, u]);

  useEffect(() => { loadFullName(); }, [loadFullName]);

  const rolLabel = extractRol(u);

  // Estado para reforzar cédula si no viene en user
  const [cedulaApi, setCedulaApi] = useState<string | null>(null);

  // Cedula directa desde user
  const cedulaFromUser = extractCedula(u);
  const cedula = pickFirst(cedulaApi, cedulaFromUser) || '—';

  // Si no hay cédula en user, intenta cargarla desde /mi-perfil/resumen
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        if (cedulaFromUser === '—' && typeof fetchJson === 'function') {
          const r: any = await fetchJson('/mi-perfil/resumen');
          const c = extractCedula(r?.usuario);
          if (isMounted && c && c !== '—') setCedulaApi(c);
        }
      } catch {
        // silencio: si falla, se queda con '—'
      }
    })();
    return () => { isMounted = false; };
  }, [cedulaFromUser, fetchJson]);

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
                {initials(fullName)}
              </Text>
            </Animated.View>
          </Pressable>

          <Text style={[g.text.h3, { marginTop: 10 }]}>{fullName}</Text>
          <Text style={[g.text.small, g.text.muted]}>{pickFirst(u?.email, u?.usuario?.correo, '—')}</Text>

          {/* Fila de info */}
          <View style={styles.infoRow}>
            <InfoChip icon="id-card-outline" label="Rol" value={rolLabel} colors={colors} g={g} />
            <InfoChip icon="finger-print-outline" label="Cédula" value={cedula} colors={colors} g={g} />
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
        <View style={[styles.secondary, { backgroundColor: colors.cardTint, borderColor: colors.tabBorder }]}>
          <Row label="Correo" value={pickFirst(u?.email, u?.usuario?.correo, '—')!} g={g} />
          <Row label="Cédula" value={cedula} g={g} />
          <Row label="Rol" value={rolLabel} g={g} />
        </View>
      </SafeAreaView>
    </FadeWrapper>
  );
}

/* ---------------- subcomponentes ---------------- */
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

/* ---------------- estilos ---------------- */
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
