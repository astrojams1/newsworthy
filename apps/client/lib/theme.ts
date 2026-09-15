import { useColorScheme } from 'react-native';
import { dark, light } from './palette';
export function useTheme() { return useColorScheme() === 'dark' ? dark : light; }
