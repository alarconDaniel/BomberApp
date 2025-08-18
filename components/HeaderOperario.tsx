import {Text, View} from "react-native";
import {styles} from "../styles/globalStyles";
import {FontAwesome5} from "@expo/vector-icons";
import React, {use, useEffect, useState} from "react";
import {useAuth} from "../auth/AuthContext";
import {StatsUsuario} from "../models/StatsUsuario";

export default function headerOperario() {

    const {fetchJson, baseUrl} = useAuth();
    const [stats, setStats] = useState<StatsUsuario>({codUsuario: 0, racha: 0, monedas: 0, xp: 0, nivel: 0});

    const listarStats = async () => {
        try {

            const resultado = await fetchJson<any>('/mis-stats/listar');

            setStats(resultado);
        } catch (e: any) {
            console.log('Error cargando stats');
        }
    };

    useEffect(() => {
        listarStats();
    }, []);

    return (
        <View style={styles.containerHeader}>
            <View style={{flexDirection: 'row'}}>
                <View style={[styles.button, {backgroundColor: '#ffcfbf'}]}>
                    <FontAwesome5 name="fire" size={27} color="#fc4103"  />
                </View>
                <Text style={{paddingLeft: 15, fontSize: 25, fontWeight: 'bold', alignSelf: 'center'}}>{stats.racha}</Text>
            </View>

            <View style={{flexDirection: 'row'}}>
                <View style={[styles.button, {backgroundColor: '#fff3bd'}]}>
                    <FontAwesome5 name="coins" size={27} color="#cca700"  />
                </View>
                <Text style={{paddingLeft: 15, fontSize: 25, fontWeight: 'bold', alignSelf: 'center'}}>{stats.monedas}</Text>
            </View>
        </View>

    )
}