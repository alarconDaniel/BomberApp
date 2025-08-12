import {Text, View} from "react-native";
import {styles} from "../styles/globalStyles";

export default function headerOperario() {
    return (
        <View style={styles.containerHeader}>
            <View style={styles.button}>
                <Text style={styles.icon}>
                    1
                </Text>
            </View>
            <View style={styles.button}>
                <Text style={styles.icon}>
                    2
                </Text>
            </View>


        </View>

    )
}