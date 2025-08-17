import {Text, View} from "react-native";
import {styles} from "../styles/globalStyles";
import {FontAwesome5} from "@expo/vector-icons";
import React from "react";

export default function headerOperario() {
    return (
        <View style={styles.containerHeader}>
            <View style={{flexDirection: 'row'}}>
                <View style={[styles.button, {backgroundColor: '#ffcfbf'}]}>
                    <FontAwesome5 name="fire" size={27} color="#fc4103"  />
                </View>
                <Text style={{paddingLeft: 15, fontSize: 25, fontWeight: 'bold', alignSelf: 'center'}}>2</Text>
            </View>

            <View style={{flexDirection: 'row'}}>
                <View style={[styles.button, {backgroundColor: '#fff3bd'}]}>
                    <FontAwesome5 name="coins" size={27} color="#cca700"  />
                </View>
                <Text style={{paddingLeft: 15, fontSize: 25, fontWeight: 'bold', alignSelf: 'center'}}>999999</Text>
            </View>
        </View>

    )
}