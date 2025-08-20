// components/HeaderOperario.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../auth/AuthContext';
import { StatsUsuario } from '../models/StatsUsuario';
import { styles as global } from '../styles/globalStyles';
import { useTheme } from '../theme/ThemeProvider';

export default function HeaderOperario() {
    const { fetchJson } = useAuth();
    const [stats, setStats] = useState<StatsUsuario>({
        codUsuario: 0, racha: 0, monedas: 0, xp: 0, nivel: 0
    });

    const { colors, isDark } = useTheme();
    const s = useMemo(() => makeStyles(colors), [colors]);

    const listarStats = async () => {
        try {
            const resultado = await fetchJson<any>('/mis-stats/listar');
            setStats(resultado);
        } catch {
            console.log('Error cargando stats');
        }
    };

    useEffect(() => { listarStats(); }, []);
    useFocusEffect(useCallback(() => { listarStats(); }, []));

    // Mantener colores de icono, pero ajustar el fondo del círculo según tema
    const fireBg  = isDark ? colors.cardTint : '#ffcfbf';
    const coinBg  = isDark ? colors.cardTint : '#fff3bd';
    const fireClr = '#fc4103';
    const coinClr = '#cca700';

    return (
        <View style={[global.containerHeader, s.headerTint]}>
            {/* Racha */}
            <View style={{ flexDirection: 'row' }}>
                <View style={[global.button, s.circleBase, { backgroundColor: fireBg }]}>
                    <FontAwesome5 name="fire" size={27} color={fireClr} />
                </View>
                <Text style={[s.value]}>{stats.racha}</Text>
            </View>

            {/* Monedas */}
            <View style={{ flexDirection: 'row' }}>
                <View style={[global.button, s.circleBase, { backgroundColor: coinBg }]}>
                    <FontAwesome5 name="coins" size={27} color={coinClr} />
                </View>
                <Text style={[s.value]}>{stats.monedas}</Text>
            </View>
        </View>
    );
}

const makeStyles = (c: import('../theme/ThemeProvider').Palette) =>
    StyleSheet.create({
        // Tinte del header sin romper layout de global.containerHeader
        headerTint: {
            backgroundColor: c.bg,            // si tu header tiene fondo, acompaña al tema
            borderBottomWidth: 0,             // deja tu global decidir bordes si los tiene
        },
        // Círculo del icono: respetamos radio/tamaño del global.button,
        // solo sumamos borde sutil en ambos temas
        circleBase: {
            borderWidth: 1,
            borderColor: c.divider,
        },
        value: {
            paddingLeft: 15,
            fontSize: 25,
            fontWeight: 'bold',
            alignSelf: 'center',
            color: c.text,                    // número visible en claro/oscuro
        },
    });
