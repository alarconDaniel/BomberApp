
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ReportsScreen from '../screens/StoreScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CustomFooter from '../components/FooterOperario';
import InventoryScreen from "../screens/InventoryScreen";

const Tab = createBottomTabNavigator();

export default function OperarioTabs() {
    return (
        <Tab.Navigator screenOptions={{ headerShown: false }}>
            {/* quita temporalmente el tabBar */}
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
            <Tab.Screen name="Store" component={ReportsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
            <Tab.Screen name="Inventory" component={InventoryScreen} />
        </Tab.Navigator>

    );
}