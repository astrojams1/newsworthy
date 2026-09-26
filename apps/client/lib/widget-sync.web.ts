// Widgets are native-only; keep web and Expo Go usable without the native bridge.
export async function syncWidgets(_apiBaseURL: string, _reading: unknown, _fetchedAt: number) {}
export function readWidgetSnapshot(_apiBaseURL: string) { return null; }
export async function syncWidgetAppearance(_appearance: string) {}
