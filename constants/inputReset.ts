import { Platform, type TextStyle } from 'react-native';

export const webInputReset = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;
