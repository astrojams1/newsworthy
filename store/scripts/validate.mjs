import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const copy = JSON.parse(await readFile(resolve(root,'listing.json')));
for (const [key,limit] of Object.entries({appleName:30,googleName:30,subtitle:30,shortDescription:80,promotionalText:170,description:4000,keywords:100})) {
  if (copy[key].length > limit) throw new Error(`${key}: ${copy[key].length}/${limit}`);
}
const assets = JSON.parse(await readFile(resolve(root,'assets/manifest.json')));
assets.push({file:'assets/google-play/feature-graphic.png',width:1024,height:500},{file:'assets/google-play/icon.png',width:512,height:512});
for (const asset of assets) {
  const image = await sharp(resolve(root,asset.file)).metadata();
  if (image.width !== asset.width || image.height !== asset.height || image.hasAlpha || image.format !== 'png') throw new Error(`Invalid asset: ${asset.file}`);
  console.log(`${asset.file}: ${image.width}×${image.height}, RGB PNG`);
}
console.log('Listing lengths and store image formats pass.');
