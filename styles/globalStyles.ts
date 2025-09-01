// theme/GlobalStyles.ts
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

// Mantengo estos estilos "legacy" por compatibilidad con cualquier uso previo.
// Si no los usas en ninguna parte, puedes eliminarlos con tranquilidad.
export const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingBottom: 40,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 12,
        backgroundColor: '#fefefe',
        borderTopWidth: 1,
        borderColor: '#ddd',
    },
    containerHeader: {
        width: '100%',
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 50,
        borderColor: '#ddd',
    },
    button: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    active: {
        backgroundColor: '#c5e1f5',
    },
    icon: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#444',
    },
    iconActive: {
        color: '#007bff',
    },
});



export const globalStyles = StyleSheet.create<{
  container: ViewStyle;
  title: TextStyle;
  btn: ViewStyle;
  text: TextStyle;
}>({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },

  // 🔹 Botón base
  btn: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  // 🔹 Texto del botón
  text: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

// 🔹 Radios reutilizables
export type RoundedKey = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export const rounded = StyleSheet.create<Record<RoundedKey, ViewStyle>>({
  none: { borderRadius: 0 },
  sm: { borderRadius: 4 },
  md: { borderRadius: 10 },
  lg: { borderRadius: 14 },
  xl: { borderRadius: 18 },
  '2xl': { borderRadius: 24 },
  full: { borderRadius: 9999 },
});



/**
 * Variantes tipográficas globales
 * ————————————————————————————————
 * h1: Título de pantalla (como Settings "Configuración")
 * h2: Subtítulo/sección (como Settings "Experiencia de la app")
 * title: Título intermedio en tarjetas/modales (20/800)
 * h3: Encabezado pequeño (18/800)
 * body: Texto normal (16/regular)
 * bodyStrong: Texto normal enfatizado (16/600)
 * small: Texto pequeño (14/regular)
 * smallStrong: Texto pequeño enfatizado (14/700)
 * caption: Pie/ayuda (12/regular)
 * captionStrong: Pie/ayuda enfatizado (12/700)
 * muted: Solo color apagado (para combinar con otras variantes)
 * secondary: Solo color "secondaryText"
 * success/danger/warning: Solo color de estado
 * onPrimary: Color para texto sobre botones primarios
 *
 * Especial Home (reto):
 * challengeTitle: 14/600
 * challengeTime:  12/regular
 */

export function makeGlobalStyles(
    c: import('../theme/ThemeProvider').Palette
) {
    const text = StyleSheet.create({
        h1: { fontSize: 32, fontWeight: '700', color: c.text },
        h2: { fontSize: 22, fontWeight: '600', color: c.text },
        title: { fontSize: 20, fontWeight: '800', color: c.text },
        h3: { fontSize: 18, fontWeight: '800', color: c.text },

        body: { fontSize: 16, color: c.text },
        bodyStrong: { fontSize: 16, fontWeight: '600', color: c.text },

        small: { fontSize: 14, color: c.text },
        smallStrong: { fontSize: 14, fontWeight: '700', color: c.text },

        caption: { fontSize: 12, color: c.mutedText },
        captionStrong: { fontSize: 12, fontWeight: '700', color: c.text },

        // Solo-color para combinar con variantes de tamaño
        muted: { color: c.mutedText },
        secondary: { color: c.secondaryText },
        success: { color: c.success },
        danger: { color: c.danger },
        warning: { color: c.warning },
        onPrimary: { color: '#fff' },

        // 🟦 Categoría especial para Home (nombre del reto + tiempo estimado)
        challengeTitle: { fontSize: 14, fontWeight: '600', color: c.text },
        challengeTime: { fontSize: 12, color: c.mutedText },
    });

    return { text };
}
