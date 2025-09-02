// components/operario/FooterOperario.tsx
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../theme/ThemeProvider';

export default function FooterOperario({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();

  return (
      <View style={[styles.container, { backgroundColor: colors.tabBg, borderColor: colors.tabBorder }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const options = descriptors[route.key]?.options || {};
          const label = (options.title as string) ?? (options.tabBarLabel as string) ?? route.name;

          const onPress = () => !isFocused && navigation.navigate(route.name as never);
          const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

          // ✅ SOLO colores desde el theme
          const color = isFocused ? colors.tabIconActive : colors.tabIcon;
          const size = styles.icon?.fontSize ? Number(styles.icon.fontSize) : 18;

          const maybeIcon =
              typeof options.tabBarIcon === 'function'
                  ? options.tabBarIcon({ focused: isFocused, color, size })
                  : null;

          return (
              <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarButtonTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={[
                    styles.button,
                    { backgroundColor: colors.tabButtonBg },
                    isFocused && { backgroundColor: colors.tabActiveBg }, // 🔵 activo desde theme
                  ]}
              >
                {maybeIcon ?? (
                    <Text style={[styles.icon, { color }, isFocused && styles.iconActive]}>
                      {label?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                )}
              </TouchableOpacity>
          );
        })}
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    backgroundColor: '#fefefe',
    borderTopWidth: 1,
    borderColor: '#ddd'
  },
  containerHeader: {
    width: '100%',
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 50,
    borderColor: '#ddd'
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center'
  },
  active: {
    backgroundColor: '#c5e1f5'
  },
  icon: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#444'
  },
  iconActive: {
    color: '#007bff'
  }
});
