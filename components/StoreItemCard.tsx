import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { ItemTienda } from '../models/ItemTienda';

type Props = {
  item: ItemTienda;
  onPress?: () => void;
  accentColor?: string;
  variant?: 'ARTICULOS' | 'COFRES' | 'ROPA';
};

const iconFallbackByTipo: Record<string, string> = {
  ARTICULOS: 'bolt',
  COFRES: 'box-open',
  ROPA: 'tshirt',
};

export default function StoreItemCard({
  item,
  onPress,
  accentColor = '#3B5BDB',
  variant = 'ARTICULOS',
}: Props) {
  // si metadata trae icon, se usa; si no, se cae al tipo
  const metaIcon =
    (item.metadataItem as any)?.icon ||
    iconFallbackByTipo[String(item.tipoItem).toUpperCase()] ||
    'shopping-bag';

  const badge = (item.metadataItem as any)?.badge; // e.g., "x2", "Racha", "Boost"
  const price = Number(item.precioItem || 0);

  return (
    <Pressable onPress={onPress} style={[s.card, s.shadow, { borderColor: accentColor }]}>
      {/* cabecera/badge */}
      <View style={[s.ribbon, { backgroundColor: accentColor }]}>
        <Text style={s.ribbonText} numberOfLines={1}>
          {item.nombreItem}
        </Text>
      </View>

      {/* ícono central */}
      <View style={s.iconWrap}>
        <FontAwesome5 name={metaIcon as any} size={28} color={accentColor} />
      </View>

      {/* badge secundario si viene */}
      {badge ? (
        <View style={[s.badge, { borderColor: accentColor }]}>
          <Text style={[s.badgeText, { color: accentColor }]}>{badge}</Text>
        </View>
      ) : null}

      {/* precio / CTA visual */}
      <View style={s.footer}>
        <Text style={s.price}>
          {price > 0 ? `$${price}` : 'Gratis'}
        </Text>
        <FontAwesome5 name="chevron-right" size={14} color="#6B7280" />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    width: 132,
    borderRadius: 16,
    backgroundColor: '#ffffff',
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
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
});
