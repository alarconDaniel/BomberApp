import React from 'react';
import {View, Text, Pressable, StyleSheet, Dimensions} from 'react-native';
import {FontAwesome5} from '@expo/vector-icons';
import {ItemTienda} from '../models/ItemTienda';
import { useTheme } from '../theme/ThemeProvider';

const {width: SCREEN_W} = Dimensions.get('window');

type Props = {
    item: ItemTienda;
    onPress?: () => void;
    accentColor?: string;
    variant?: 'POTENCIADOR' | 'COFRE' | 'ROPA';
};

const iconFallbackByTipo: Record<string, string> = {
    POTENCIADOR: 'bolt',
    COFRE: 'box-open',
    ROPA: 'tshirt',
};

export default function StoreItemCard({
                                          item,
                                          onPress,
                                          accentColor = '#3B5BDB',
                                          variant = 'POTENCIADOR',
                                      }: Props) {
    const { colors } = useTheme();

    const metaIcon =
        (item.metadataItem as any)?.icon ||
        iconFallbackByTipo[String(item.tipoItem).toUpperCase()] ||
        'shopping-bag';

    const badge = (item.metadataItem as any)?.badge;
    const price = Number(item.precioItem || 0);

    /* ====== ROPA ====== */
    if (item.tipoItem.toUpperCase() == 'ROPA') {
        return (
            <Pressable
                onPress={onPress}
                style={[
                    s.card,
                    s.shadow,
                    {
                        borderColor: accentColor,
                        backgroundColor: colors.card, // 👈 fondo dinámico
                    },
                ]}
            >
                <View style={[s.ribbon, { backgroundColor: accentColor }]}>
                    <Text style={s.ribbonText}>{item.nombreItem}</Text>
                </View>

                <View style={[s.iconWrap, { marginVertical: 20 }]}>
                    <FontAwesome5 name={metaIcon as any} size={68} color={accentColor} />
                </View>

                {badge ? (
                    <View style={[s.badge, { borderColor: accentColor }]}>
                        <Text style={[s.badgeText, { color: accentColor }]}>{badge}</Text>
                    </View>
                ) : null}

                <View style={[s.footer, { flex: 1, borderTopColor: colors.divider }]}>
                    <Text style={[s.price, { color: colors.text }]}>
                        {price > 0 ? `$${price}` : 'Gratis'}
                    </Text>
                    <FontAwesome5 name="chevron-right" size={14} color={colors.sub} />
                </View>
            </Pressable>
        );
    }

    /* ====== COFRE ====== */
    if (item.tipoItem.toUpperCase() == 'COFRE') {
        return (
            <Pressable onPress={onPress} style={{ flex: 1, width: 100 }}>
                <View style={[s.ribbon, { backgroundColor: accentColor }]}>
                    <Text style={s.ribbonText}>{item.nombreItem}</Text>
                </View>

                <View style={{ alignSelf: 'center', paddingVertical: 10 }}>
                    <FontAwesome5
                        name={metaIcon as any}
                        size={item.precioItem == 1000 ? 60 : item.precioItem == 100 ? 50 : 40}
                        color={accentColor}
                    />
                </View>

                {badge ? (
                    <View style={[s.badge, { borderColor: accentColor }]}>
                        <Text style={[s.badgeText, { color: accentColor }]}>{badge}</Text>
                    </View>
                ) : null}

                <View>
                    <Text style={[s.price, { alignSelf: 'center' }]}>
                        {price > 0 ? `$${price}` : 'Gratis'}
                    </Text>
                </View>
            </Pressable>
        );
    }

    /* ====== POTENCIADOR (ARTÍCULOS) ====== */
    if (item.tipoItem.toUpperCase() == 'POTENCIADOR') {
        return (
            <Pressable onPress={onPress}>
                {/* barrita decorativa — se queda EXACTA como en el style */}
                <View style={s.sectionBar2} />

                <View
                    style={[
                        s.cardPotenciador,
                        s.shadow,
                        {
                            borderColor: accentColor,
                            backgroundColor: colors.card, // 👈 fondo dinámico
                        },
                    ]}
                >
                    <View style={[s.ribbon, { backgroundColor: accentColor }]}>
                        <Text style={s.ribbonText}>{item.nombreItem}</Text>
                    </View>

                    <View style={[s.iconWrap]}>
                        <FontAwesome5 name={metaIcon as any} size={28} color={accentColor} />
                    </View>

                    {badge ? (
                        <View style={[s.badge, { borderColor: accentColor }]}>
                            <Text style={[s.badgeText, { color: accentColor }]}>{badge}</Text>
                        </View>
                    ) : null}

                    <View style={[s.footer, { borderTopColor: colors.divider }]}>
                        <Text style={[s.price, { color: colors.text }]}>
                            {price > 0 ? `$${price}` : 'Gratis'}
                        </Text>
                        <FontAwesome5 name="chevron-right" size={14} color={colors.sub} />
                    </View>
                </View>
            </Pressable>
        );
    }

    return null;
}

const s = StyleSheet.create({
    card: {
        width: SCREEN_W * 0.45,
        flex: 1,
        borderRadius: 16,
        backgroundColor: '#ffffff', // se sobreescribe con colors.card
        paddingTop: 10,
        paddingHorizontal: 10,
        paddingBottom: 10,
        borderWidth: 2,
    },
    sectionBar2: {
        height: 10,
        overflow: 'visible',
        alignSelf: 'center',
        width: 15,
        outlineColor: '#a5afc4',
        outlineWidth: 2,
        backgroundColor: 'red', // 👈 sin cambios
    },
    cardPotenciador: {
        width: SCREEN_W * 0.28,
        borderRadius: 16,
        backgroundColor: '#ffffff', // se sobreescribe con colors.card
        paddingTop: 10,
        paddingHorizontal: 10,
        paddingBottom: 10,
        borderWidth: 2,
    },
    shadow: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 4,
    },
    ribbon: {
        alignSelf: 'stretch',
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 10,
    },
    ribbonText: {
        fontSize: 12,
        color: 'white',
        fontWeight: '700',
        textAlign: 'center',
    },
    iconWrap: {
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        alignSelf: 'center',
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderWidth: 1.5,
        marginTop: 2,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    footer: {
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6', // se sobreescribe con colors.divider
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    price: {
        fontSize: 14,
        fontWeight: '800',
        color: '#111827', // se sobreescribe con colors.text
    },
});
