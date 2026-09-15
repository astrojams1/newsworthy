import Constants from 'expo-constants';
const extra = Constants.expoConfig?.extra;
export const website = 'https://newsworthy-indol.vercel.app';
export const apiOrigin: string = process.env.EXPO_OS === 'web' ? '' : (extra?.apiBaseUrl ?? website);
export const privacyUrl: string = extra?.privacyUrl ?? `${website}/privacy`;
export const supportUrl: string = extra?.supportUrl ?? `${website}/support`;
