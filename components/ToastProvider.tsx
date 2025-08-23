// components/ToastProvider.tsx
import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {Animated, Easing, StyleSheet, View, Text, Pressable} from 'react-native';
import {FontAwesome5} from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { makeGlobalStyles } from '../theme/GlobalStyles';

type ToastType = 'success' | 'error' | 'info';
type Toast = { id: number; type: ToastType; text: string };

type Ctx = {
    show: (type: ToastType, text: string) => void;
    success: (text: string) => void;
    error: (text: string) => void;
    info: (text: string) => void;
};
const ToastCtx = createContext<Ctx>({} as any);

export function ToastProvider({children}: {children: React.ReactNode}) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const idRef = useRef(1);

    const remove = (id: number) => setToasts(ts => ts.filter(t => t.id !== id));
    const show = (type: ToastType, text: string) => {
        const id = idRef.current++;
        setToasts(ts => [...ts, {id, type, text}]);
        setTimeout(() => remove(id), 2600);
    };

    const ctx: Ctx = {
        show,
        success: (t) => show('success', t),
        error: (t) => show('error', t),
        info: (t) => show('info', t),
    };

    return (
        <ToastCtx.Provider value={ctx}>
            {children}
            <ToastsHost toasts={toasts} onRemove={remove} />
        </ToastCtx.Provider>
    );
}

export const useToast = () => useContext(ToastCtx);

function ToastsHost({toasts, onRemove}:{toasts: Toast[]; onRemove:(id:number)=>void}) {
    const { colors } = useTheme();
    return (
        <View pointerEvents="box-none" style={styles.host}>
            {toasts.map(t => (
                <ToastItem key={t.id} toast={t} onClose={() => onRemove(t.id)} colors={colors} />
            ))}
        </View>
    );
}

function ToastItem({toast, onClose, colors}: {toast: Toast; onClose: () => void; colors: any}) {
    const g = makeGlobalStyles(colors);
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
    }, [anim]);

    const translateY = anim.interpolate({inputRange: [0, 1], outputRange: [-20, 0]});
    const opacity = anim;

    const palette = {
        success: { bg: colors.successSoft, border: colors.success, icon: 'check-circle' },
        error:   { bg: colors.dangerSoft,  border: colors.danger,  icon: 'times-circle' },
        info:    { bg: colors.primarySoft, border: colors.primary, icon: 'info-circle' },
    }[toast.type];

    return (
        <Animated.View style={[
            styles.toast,
            { backgroundColor: palette.bg, borderColor: palette.border, transform: [{translateY}], opacity }
        ]}>
            <FontAwesome5 name={palette.icon as any} size={18} color={palette.border}/>
            <Text style={[g.text.bodyStrong, { flex: 1 }]} numberOfLines={2}>{toast.text}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
                <FontAwesome5 name="times" size={16} color={colors.mutedText} />
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    host: { position: 'absolute', top: 50, left: 12, right: 12, gap: 8 },
    toast: {
        borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12,
        flexDirection: 'row', alignItems: 'center', gap: 10,
        shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: {width: 0, height: 4}, shadowRadius: 8, elevation: 4,
    },
});
