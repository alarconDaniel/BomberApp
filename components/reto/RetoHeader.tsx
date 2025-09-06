// components/reto/RetoHeader.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { Reto } from '../../models/Reto';
import { InstanciaUR, s10 } from './utils';

export default function RetoHeader({
                                       reto,
                                       ur,
                                       estadoVisible,
                                       esHoy,
                                   }: {
    reto: Reto;
    ur: InstanciaUR | null;
    estadoVisible: 'Disponible' | 'Aún no disponible' | 'Vencido' | 'No asignado';
    esHoy: boolean;
}) {
    const { colors } = useTheme();
    const g = makeGlobalStyles(colors);

    const pillStyle = {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        alignSelf: 'flex-start' as const,
        marginTop: 10,
        borderWidth: 1,
    };

    const estadoSty =
        estadoVisible === 'Disponible'
            ? { bg: '#e8f5e9', border: '#a5d6a7', text: '#1b5e20' }
            : estadoVisible === 'Aún no disponible'
                ? { bg: '#fff4e5', border: '#ffd8a8', text: '#8a4b08' }
                : estadoVisible === 'Vencido'
                    ? { bg: '#fdecea', border: '#f5c6cb', text: '#842029' }
                    : { bg: colors.card, border: colors.divider, text: colors.text };

    return (
        <View style={{ marginTop: 8 }}>
            <Text style={[g.text.h1, { marginTop: 20 }]}>{reto.nombreReto}</Text>
            <Text style={[g.text.body, g.text.secondary, { marginTop: 8, fontSize: 16 }]}>
                {reto.descripcionReto}
            </Text>

            <View style={{ marginTop: 12 }}>
                <Text style={g.text.body}>
                    <Text style={g.text.bodyStrong}>Tipo: </Text>
                    {(reto as any)?.tipoReto ? String((reto as any).tipoReto).toUpperCase() : '—'} ·{' '}
                    <Text style={g.text.bodyStrong}>Tiempo estimado: </Text>
                    {Math.round((reto.tiempoEstimadoSegReto ?? 0) / 60)} min
                </Text>
            </View>

            <View
                style={{
                    ...pillStyle,
                    backgroundColor: colors.card,
                    borderColor: colors.divider,
                }}
            >
                <Text style={g.text.caption}>
                    Ventana:{' '}
                    {ur?.fechaObjetivo ? s10(ur.fechaObjetivo) : `${s10(ur?.ventanaInicio)}  →  ${s10(ur?.ventanaFin)}`}
                </Text>
            </View>

            <View
                style={{
                    ...pillStyle,
                    backgroundColor: estadoSty.bg,
                    borderColor: estadoSty.border,
                }}
            >
                <Text style={{ color: estadoSty.text }}>
                    Estado del reto (hoy): {estadoVisible}
                </Text>
            </View>

            {ur && !esHoy && (
                <Text style={[g.text.caption, { marginTop: 10 }]}>
                    Este reto corresponde a otra fecha. Solo puede resolverse el día asignado.
                </Text>
            )}
        </View>
    );
}
