import { useColorScheme } from 'react-native';
export function useSystemAppearance() { return useColorScheme() === 'dark'; }
