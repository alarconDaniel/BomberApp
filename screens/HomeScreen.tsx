import {View, Text, Button, Animated} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import FooterOperario from '../components/FooterOperario'
import HeaderOperario from '../components/HeaderOperario'
import FadeWrapper from "../components/FadeWrapper";
import ScrollView = Animated.ScrollView;


export default function HomeScreen({navigation}: any) {
    return (
        <FadeWrapper>
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                <HeaderOperario/>

                <ScrollView>
                    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <Text style={{fontSize: 24}}>¡Bienvenido!</Text>
                        <Text style={{fontSize: 24}}>Este es el home</Text>
                    </View>

                    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <Text style={{fontSize: 24}}>¡Bienvenido!</Text>
                        <Text style={{fontSize: 24}}>Este es el home</Text>
                    </View>
                    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <Text style={{fontSize: 24}}>¡Bienvenido!</Text>
                        <Text style={{fontSize: 24}}>Este es el home</Text>
                    </View>
                    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                        <Text style={{fontSize: 24}}>¡Bienvenido!</Text>
                        <Text style={{fontSize: 24}}>Este es el home</Text>
                    </View>


                </ScrollView>

            </View>
        </FadeWrapper>
    );
}
