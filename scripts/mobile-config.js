import { readFile } from 'node:fs/promises';

function publicUrl(value, name, { originOnly = false } = {}) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${name} must be an HTTPS URL`); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
    || /^(localhost|127\.|0\.|\[::1\])/.test(url.hostname)
    || /(^|\.)(example\.(com|org|net)|invalid|test)$/.test(url.hostname)) {
    throw new Error(`${name} must be a public HTTPS URL without credentials, query or fragment`);
  }
  if (originOnly && url.pathname !== '/') throw new Error(`${name} must be an origin without a path`);
  return originOnly ? url.origin : url.href;
}

export function validateMobileConfig(input, { release = false } = {}) {
  const config = { ...input };
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(config.appId ?? '')) {
    throw new Error('appId must be a reverse-domain identifier, e.g. com.yourcompany.newsworthy');
  }
  if (release && /(^|\.)(example|placeholder|test)(\.|$)/.test(config.appId)) {
    throw new Error('Choose your permanent appId in mobile.release.json before a release build');
  }
  config.apiBaseUrl = publicUrl(config.apiBaseUrl, 'apiBaseUrl', { originOnly: true });
  for (const name of ['privacyUrl', 'supportUrl']) {
    if (release || config[name]) config[name] = publicUrl(config[name], name);
  }
  return config;
}

export async function readMobileConfig(options) {
  const config = JSON.parse(await readFile(new URL('../mobile.release.json', import.meta.url), 'utf8'));
  return validateMobileConfig(config, options);
}
