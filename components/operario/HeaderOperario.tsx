// components/HeaderOperario.tsx
import { Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from "../../auth/AuthContext";
import { StatsUsuario } from "../../models/StatsUsuario";
import { useTheme } from '../../theme/ThemeProvider'; // ⬅
import {styles} from "../styles/globalStyles";

export default function HeaderOperario() {
    const { colors } = useTheme();           // ⬅
    const { fetchJson } = useAuth();
    const [stats, setStats] = useState<StatsUsuario>({ codUsuario: 0, racha: 0, monedas: 0, xp: 0, nivel: 0 });

    const listarStats = async () => {
        try { const resultado = await fetchJson<any>('/mis-stats/listar'); setStats(resultado); }
        catch { /* ignore */ }
    };

    useEffect(() => { listarStats(); }, []);
    useFocusEffect(useCallback(() => { listarStats(); }, []));

    return (
        <View style={[{backgroundColor: colors.bgHeader }, styles.containerHeader]}>
            <View style={{ flexDirection: 'row' }}>
                <View style={[{backgroundColor: colors.streakBg}, styles.button]}>
                    <FontAwesome5 name="fire" size={27} color={colors.streak} />
                </View>
                <Text style={{ paddingLeft: 15, fontSize: 25, fontWeight: 'bold', alignSelf: 'center', color: colors.text }}>{stats.racha}</Text>
            </View>

            <View style={{ flexDirection: 'row' }}>
                <View style={[{backgroundColor: colors.coinBg}, styles.button]}>
                <FontAwesome5 name="coins" size={27} color={colors.coin} />
                </View>
                <Text style={{ paddingLeft: 12, fontSize: 24, fontWeight: 'bold', alignSelf: 'center', color: colors.text }}>{stats.monedas}</Text>
            </View>
        </View>
    );
}
