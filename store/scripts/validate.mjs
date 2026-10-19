import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Store copy lives in store.json, the shared app-release skill's store data.
const store = JSON.parse(await readFile(resolve(root,'store.json')));
const fields = {
  'listing.name': [store.listing.name, 30], 'google.title': [store.google.title, 30], 'listing.subtitle': [store.listing.subtitle, 30],
  'google.shortDescription': [store.google.shortDescription, 80], 'listing.promotionalText': [store.listing.promotionalText, 170],
  'listing.description': [store.listing.description, 4000], 'google.fullDescription': [store.google.fullDescription, 4000],
  'listing.keywords': [store.listing.keywords, 100], 'review.notes': [store.review.notes, 4000],
};
for (const [key,[text,limit]] of Object.entries(fields)) {
  if (text.length > limit) throw new Error(`${key}: ${text.length}/${limit}`);
}
const assets = JSON.parse(await readFile(resolve(root,'assets/manifest.json')));
assets.push({file:'assets/google-play/feature-graphic.png',width:1024,height:500},{file:'assets/google-play/icon.png',width:512,height:512});
for (const asset of assets) {
  const image = await sharp(resolve(root,asset.file)).metadata();
  if (image.width !== asset.width || image.height !== asset.height || image.hasAlpha || image.format !== 'png') throw new Error(`Invalid asset: ${asset.file}`);
  console.log(`${asset.file}: ${image.width}×${image.height}, RGB PNG`);
}
console.log('Listing lengths and store image formats pass.');
