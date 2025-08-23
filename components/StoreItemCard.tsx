// components/StoreItemCard.tsx
import React from 'react';
import {View, Text, Pressable, StyleSheet, Dimensions} from 'react-native';
import {FontAwesome5} from '@expo/vector-icons';
import {ItemTienda} from '../models/ItemTienda';
import {useTheme} from '../theme/ThemeProvider';
import { makeGlobalStyles } from '../theme/GlobalStyles';

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
    ROPA: 'tshirt'
};

export default function StoreItemCard({
                                          item,
                                          onPress,
                                          accentColor = '#3B5BDB',
                                          variant = 'POTENCIADOR'
                                      }: Props) {
    const {colors} = useTheme();
    const g = makeGlobalStyles(colors);

    const metaIcon = (item.metadataItem as any)?.icon || iconFallbackByTipo[String(item.tipoItem).toUpperCase()] || 'shopping-bag';
    const badge = (item.metadataItem as any)?.badge;
    const price = Number(item.precioItem || 0);

    // ROPA
    if (item.tipoItem.toUpperCase() === 'ROPA') {
        return (
            <Pressable onPress={onPress} style={[s(colors).card, s(colors).shadow, {borderColor: accentColor}]}>
                {/* cabecera/badge */}
                <View style={[s(colors).ribbon, {backgroundColor: accentColor}]}>
                    <Text style={[g.text.captionStrong, { color: 'white', textAlign: 'center' }]}>
                        {item.nombreItem}
                    </Text>
                </View>

                {/* ícono central */}
                <View style={[s(colors).iconWrap, {marginVertical: 20}]}>
                    <FontAwesome5 name={metaIcon as any} size={68} color={accentColor}/>
                </View>

                {/* badge secundario si viene */}
                {badge ? (
                    <View style={[s(colors).badge, {borderColor: accentColor}]}>
                        <Text style={[g.text.captionStrong, {color: accentColor}]}>{badge}</Text>
                    </View>
                ) : null}

                {/* precio / CTA visual */}
                <View style={[s(colors).footer, {flex: 1}]}>
                    <Text style={[g.text.smallStrong, { color: colors.text }]}>{price > 0 ? `$${price}` : 'Gratis'}</Text>
                    <FontAwesome5 name="chevron-right" size={14} color={colors.mutedText}/>
                </View>
            </Pressable>
        );
    }

    // COFRE
    if (item.tipoItem.toUpperCase() === 'COFRE') {
        return (
            <Pressable onPress={onPress} style={{flex: 1, width: 100}}>
                {/* cabecera/badge */}
                <View style={[s(colors).ribbon, {backgroundColor: accentColor}]}>
                    <Text style={[g.text.captionStrong, { color: 'white', textAlign: 'center' }]}>
                        {item.nombreItem}
                    </Text>
                </View>

                {/* ícono central */}
                {item.precioItem == 1000 && (
                    <View style={{ alignSelf: 'center', paddingVertical: 10, justifyContent: 'flex-end', flex: 1 }}>
                        <FontAwesome5 name={metaIcon as any} size={60} color={accentColor}/>
                    </View>
                )}

                {item.precioItem == 100 && (
                    <View style={{ alignSelf: 'center', paddingVertical: 10, justifyContent: 'flex-end', flex: 1 }}>
                        <FontAwesome5 name={metaIcon as any} size={50} color={accentColor}/>
                    </View>
                )}

                {item.precioItem == 10 && (
                    <View style={{ alignSelf: 'center', paddingVertical: 10, justifyContent: 'flex-end', flex: 1 }}>
                        <FontAwesome5 name={metaIcon as any} size={40} color={accentColor}/>
                    </View>
                )}

                {/* badge secundario si viene */}
                {badge ? (
                    <View style={[s(colors).badge, {borderColor: accentColor}]}>
                        <Text style={[g.text.captionStrong, {color: accentColor}]}>{badge}</Text>
                    </View>
                ) : null}

                {/* precio / CTA visual */}
                <View>
                    <Text style={[g.text.smallStrong, {alignSelf: 'center', color: colors.text}]}>
                        {price > 0 ? `$${price}` : 'Gratis'}
                    </Text>
                </View>
            </Pressable>
        );
    }

    // POTENCIADOR
    return (
        <Pressable onPress={onPress}>
            <View style={[s(colors).sectionBar2, {backgroundColor: colors.storeRedBar, outlineColor: colors.outline}]}/>

            <View style={[s(colors).cardPotenciador, s(colors).shadow, {borderColor: accentColor}]}>

                {/* cabecera/badge */}
                <View style={[s(colors).ribbon, {backgroundColor: accentColor}]}>
                    <Text style={[g.text.captionStrong, { color: 'white', textAlign: 'center' }]}>
                        {item.nombreItem}
                    </Text>
                </View>

                {/* ícono central */}
                <View style={[s(colors).iconWrap]}>
                    <FontAwesome5 name={metaIcon as any} size={28} color={accentColor}/>
                </View>

                {/* badge secundario si viene */}
                {badge ? (
                    <View style={[s(colors).badge, {borderColor: accentColor}]}>
                        <Text style={[g.text.captionStrong, {color: accentColor}]}>{badge}</Text>
                    </View>
                ) : null}

                {/* precio / CTA visual */}
                <View style={s(colors).footer}>
                    <Text style={[g.text.smallStrong, { color: colors.text }]}>{price > 0 ? `$${price}` : 'Gratis'}</Text>
                    <FontAwesome5 name="chevron-right" size={14} color={colors.mutedText}/>
                </View>
            </View>
        </Pressable>
    );
}

const s = (c: import('../theme/ThemeProvider').Palette) => StyleSheet.create({
    card: {
        width: SCREEN_W * 0.45,
        flex: 1,
        borderRadius: 16,
        backgroundColor: c.card,
        paddingTop: 10,
        paddingHorizontal: 10,
        paddingBottom: 10,
        borderWidth: 2
    },
    sectionBar2: {
        height: 10,
        overflow: 'visible',
        alignSelf: 'center',
        width: 15,
        outlineColor: c.outline,
        outlineWidth: 2,
        backgroundColor: c.storeRedBar
    },
    cardPotenciador: {
        width: SCREEN_W * 0.28,
        borderRadius: 16,
        backgroundColor: c.card,
        paddingTop: 10,
        paddingHorizontal: 10,
        paddingBottom: 10,
        borderWidth: 2
    },
    shadow: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: {width: 0, height: 4},
        shadowRadius: 8,
        elevation: 4
    },
    ribbon: {alignSelf: 'stretch', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10},
    iconWrap: {height: 72, alignItems: 'center', justifyContent: 'center'},
    badge: {
        alignSelf: 'center',
        borderRadius: 999,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderWidth: 1.5,
        marginTop: 2
    },
    footer: {
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: c.imageBg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
});
