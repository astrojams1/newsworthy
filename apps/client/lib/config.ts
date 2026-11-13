import Constants from 'expo-constants';
const extra = Constants.expoConfig?.extra;
export const website = 'https://newsworthy-indol.vercel.app';
export const apiOrigin: string = process.env.EXPO_OS === 'web' ? '' : (extra?.apiBaseUrl ?? website);
export const privacyUrl: string = extra?.privacyUrl ?? `${website}/privacy`;
// The App Store listing, linked from the web header so a browser visitor can find the app.
export const appStoreUrl = 'https://apps.apple.com/app/id6812519450';
export const supportUrl: string = extra?.supportUrl ?? `${website}/support`;
