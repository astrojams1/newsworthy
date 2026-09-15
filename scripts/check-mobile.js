import { readMobileConfig } from './mobile-config.js';
import { validReading } from '../apps/client/lib/reading.js';

const config = await readMobileConfig({ release: true });
if (process.argv.includes('--live')) {
  const response = await fetch(`${config.apiBaseUrl}/api/current`, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok || !validReading(await response.json())) throw new Error('Backend must return a valid current reading');
  for (const name of ['privacyUrl', 'supportUrl']) {
    const response = await fetch(config[name], { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`${name} is not publicly accessible`);
  }
}
console.log('Mobile release configuration passed. Signing and store review are separate steps.');
