// app/(admin)/_layout.tsx
import { Tabs } from 'expo-router';

export default function AdminTabsLayout() {
    return (
        <Tabs screenOptions={{ headerShown: false }}>
            <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
            <Tabs.Screen name="users" options={{ title: 'Usuarios' }} />
            <Tabs.Screen name="reports" options={{ title: 'Reportes' }} />
        </Tabs>
    );
}
