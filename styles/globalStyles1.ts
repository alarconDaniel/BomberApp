export const colors = {
  white: '#FFFFFF',
  red: '#D32F2F',
  orange: '#F57C00',
  amber: '#FFA000',
  yellow: '#FFEB3B',
  blue: '#1976D2',
  navy: '#0D1B2A',
  black: '#000000',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray700: '#374151',
};

export const globalStyles = {
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.navy,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.blue,
  },
  placeholderBox: {
    height: 180,
    backgroundColor: colors.amber,
    borderRadius: 12,
  },
  footer: {
    height: 64,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.navy,
  },
};
