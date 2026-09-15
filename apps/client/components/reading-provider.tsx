import { createContext, use, type PropsWithChildren } from 'react';
import { useSystemAppearance } from '@/lib/system-appearance';
import { useReading } from '@/lib/use-reading';

const ReadingContext = createContext<(ReturnType<typeof useReading> & { dark: boolean }) | null>(null);
export function ReadingProvider({ children }: PropsWithChildren) {
  const reading = useReading();
  const dark = useSystemAppearance();
  return <ReadingContext value={{ ...reading, dark }}>{children}</ReadingContext>;
}
export function useCurrentReading() {
  const value = use(ReadingContext);
  if (!value) throw new Error('ReadingProvider is required');
  return value;
}
