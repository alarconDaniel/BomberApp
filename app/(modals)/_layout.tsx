// app/(modals)/_layout.tsx
import { Stack } from 'expo-router';

export default function ModalLayout() {

    return (
        <Stack
            screenOptions={{
                presentation: 'modal',          // iOS modal; en Android es full-screen
                headerShown: false,             // pondremos nuestro botón “Volver”
                contentStyle: { backgroundColor: '#fff' },
                gestureEnabled: false,
                fullScreenGestureEnabled: false,
            }}
        />
    );
}
