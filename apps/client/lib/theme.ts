import { useCurrentReading } from '@/components/reading-provider';
import { themeForLevel } from './palette';
export function useTheme() {
  const { reading, dark } = useCurrentReading();
  return themeForLevel(reading?.score, dark);
}
