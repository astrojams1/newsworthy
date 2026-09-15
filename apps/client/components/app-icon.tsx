import { Image } from 'expo-image';

export function AppIcon({ name, color }: { name: 'share' | 'about'; color: string }) {
  const path = name === 'about'
    ? '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-11v2"/>'
    : process.env.EXPO_OS === 'android'
      ? '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4"/>'
      : '<path d="M12 15V3m-4 4 4-4 4 4M7 11H4v10h16V11h-3"/>';
  const source = process.env.EXPO_OS === 'ios'
    ? `sf:${name === 'share' ? 'square.and.arrow.up' : 'info.circle'}`
    : { uri: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`)}` };
  return <Image source={source} tintColor={color} accessibilityElementsHidden importantForAccessibility="no" style={{ width: 24, height: 24 }} />;
}
