import {View, Text, Button} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import FooterOperario from '../../components/FooterOperario'
import FadeWrapper from "../../components/FadeWrapper";


export default function HomeScreen({navigation}: any) {
    return (
        <FadeWrapper>
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <Text style={{fontSize: 24}}>Este es el panel de tienda</Text>
            </View>
        </FadeWrapper>
    );
}
