import StackNavigator from './navigation/StackNavigator';
import {NavigationContainer} from "@react-navigation/native";
import {AuthProvider} from "./auth/AuthContext";

export default function App() {
    return (
        <AuthProvider>
            <NavigationContainer>
                <StackNavigator/>
            </NavigationContainer>
        </AuthProvider>
    );
}
