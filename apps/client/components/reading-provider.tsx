import { createContext, use, type PropsWithChildren } from 'react';
import { useSystemAppearance } from '@/lib/system-appearance';
import { resolveDark } from '@/lib/preferences';
import { usePreferences } from '@/components/preferences-provider';
import { useReading } from '@/lib/use-reading';

const ReadingContext = createContext<(ReturnType<typeof useReading> & { dark: boolean }) | null>(null);
export function ReadingProvider({ children }: PropsWithChildren) {
  const reading = useReading();
  const { preferences } = usePreferences();
  // The chosen appearance wins; "System" follows the operating system.
  const dark = resolveDark(preferences.theme, useSystemAppearance());
  return <ReadingContext value={{ ...reading, dark }}>{children}</ReadingContext>;
}
export function useCurrentReading() {
  const value = use(ReadingContext);
  if (!value) throw new Error('ReadingProvider is required');
  return value;
}
