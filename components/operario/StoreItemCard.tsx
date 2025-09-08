import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { FontAwesome5 } from '@expo/vector-icons';
import { ItemTienda } from '../../models/ItemTienda';
import { useTheme } from '../../theme/ThemeProvider';
import { makeGlobalStyles } from '../../theme/GlobalStyles';
import { resolveItemIconFromBd } from '../../config/icons/itemIcons';

const { width: SCREEN_W } = Dimensions.get('window');

type Props = {
    item: ItemTienda;
    onPress?: () => void;
    accentColor?: string;
    variant?: 'POTENCIADOR' | 'COFRE' | 'ROPA';
};

const iconFallbackByTipo: Record<string, string> = { POTENCIADOR: 'bolt', COFRE: 'box-open', ROPA: 'tshirt' };

export default function StoreItemCard({ item, onPress, accentColor = '#3B5BDB', variant = 'POTENCIADOR' }: Props) {
    const { colors, isDark } = useTheme();
    const g = makeGlobalStyles(colors);

    const bdIcon = item.iconoPath;
    const imgSrc = resolveItemIconFromBd(bdIcon, isDark);
    const price = Number(item.precioItem || 0);
    const isRopa = String(item.tipoItem).toUpperCase() === 'ROPA';
    const ropaDisabled = isRopa && !!item.yaPosee;

    // estilos
    const styles = s(colors);

    // ---- ROPA ----
    if (isRopa) {
        return (
            <Pressable
                onPress={ropaDisabled ? undefined : onPress}
                disabled={ropaDisabled}
                style={[styles.card, styles.shadow, { borderColor: accentColor, opacity: ropaDisabled ? 0.6 : 1 }]}
            >
                <View style={[styles.ribbon, { backgroundColor: accentColor }]}>
                    <Text style={[g.text.captionStrong, { color: 'white', textAlign: 'center' }]}>{item.nombreItem}</Text>
                </View>

                <View style={[styles.iconWrap, { marginVertical: 10 }]}>
                    <Image source={imgSrc} style={{ width: 98, height: 98 }} contentFit="contain" cachePolicy="memory-disk" transition={120} />
                </View>

                {ropaDisabled && (
                    <View style={[styles.badge, { borderColor: colors.danger, marginTop: 6 }]}>
                        <Text style={[g.text.captionStrong, { color: colors.danger }]}>Ya la tienes</Text>
                    </View>
                )}

                <View style={[styles.footer, { flex: 1 }]}>
                    <Text style={[g.text.smallStrong, { color: colors.text }]}>{price > 0 ? `$${price}` : 'Gratis'}</Text>
                    <FontAwesome5 name="chevron-right" size={14} color={colors.mutedText} />
                </View>
            </Pressable>
        );
    }

    // ---- COFRE ----
    if (String(item.tipoItem).toUpperCase() === 'COFRE') {
        return (
            <Pressable onPress={onPress} style={{ flex: 1, width: 100 }}>
                <View style={[styles.ribbon, { backgroundColor: accentColor }]}>
                    <Text style={[g.text.captionStrong, { color: 'white', textAlign: 'center' }]}>{item.nombreItem}</Text>
                </View>

                <View style={{ alignSelf: 'center', paddingVertical: 10, justifyContent: 'flex-end', flex: 1 }}>
                     <Image
                       source={imgSrc}
                       style={{
                         width: item.precioItem == 1000 ? 100 : item.precioItem == 100 ? 88 : 80,
                         height: item.precioItem == 1000 ? 100 : item.precioItem == 100 ? 88 : 80,
                       }}
                       contentFit="contain"
                       cachePolicy="memory-disk"
                       transition={120}
                     />
                </View>

                <View>
                    <Text style={[g.text.smallStrong, { alignSelf: 'center', color: colors.text }]}>
                        {price > 0 ? `$${price}` : 'Gratis'}
                    </Text>
                </View>
            </Pressable>
        );
    }

    // ---- POTENCIADOR ----
    return (
        <Pressable onPress={onPress}>
            <View style={[styles.sectionBar2, { backgroundColor: colors.storeRedBar, outlineColor: colors.outline }]} />
            <View style={[styles.cardPotenciador, styles.shadow, { borderColor: accentColor }]}>
                <View style={[styles.ribbon, { backgroundColor: accentColor }]}>
                    <Text style={[g.text.captionStrong, { color: 'white', textAlign: 'center' }]}>{item.nombreItem}</Text>
                </View>

                <View style={styles.iconWrap}>
                    <Image source={imgSrc} style={{ width: 78, height: 78 }} contentFit="contain" cachePolicy="memory-disk" transition={120} />
                </View>

                <View style={styles.footer}>
                    <Text style={[g.text.smallStrong, { color: colors.text }]}>{price > 0 ? `$${price}` : 'Gratis'}</Text>
                    <FontAwesome5 name="chevron-right" size={14} color={colors.mutedText} />
                </View>
            </View>
        </Pressable>
    );
}

const s = (c: import('../../theme/ThemeProvider').Palette) =>
    StyleSheet.create({
        card: {
            width: SCREEN_W * 0.45,
            flex: 1,
            borderRadius: 16,
            backgroundColor: c.card,
            paddingTop: 10,
            paddingHorizontal: 10,
            paddingBottom: 10,
            borderWidth: 2,
        },
        sectionBar2: { height: 10, overflow: 'visible', alignSelf: 'center', width: 15, outlineColor: c.outline, outlineWidth: 2, backgroundColor: c.storeRedBar },
        cardPotenciador: { width: SCREEN_W * 0.28, borderRadius: 16, backgroundColor: c.card, paddingTop: 10, paddingHorizontal: 10, paddingBottom: 10, borderWidth: 2 },
        shadow: { shadowColor: '#000', shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 4 },
        ribbon: { alignSelf: 'stretch', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10 },
        iconWrap: { height: 72, alignItems: 'center', justifyContent: 'center' },
        badge: { alignSelf: 'center', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1.5, marginTop: 2 },
        footer: { marginTop: 5, borderTopWidth: 1, borderTopColor: c.imageBg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    });
