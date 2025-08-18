import FadeWrapper from "../../components/FadeWrapper";
import {Text, View} from "react-native";

export default function HomeScreen({ navigation }: any) {
    return (
        <FadeWrapper>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24 }}>Este es el panel de inventario</Text>
            </View>
        </FadeWrapper>
    );
}