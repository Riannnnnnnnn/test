import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../public/assets/", import.meta.url));

async function imageFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return imageFiles(path);
    return /\.(png|jpe?g)$/i.test(entry.name) ? [path] : [];
  }));
  return nested.flat();
}

const files = await imageFiles(root);
let originalBytes = 0;
let optimizedBytes = 0;
for (const source of files) {
  const target = source.slice(0, -extname(source).length) + ".webp";
  await sharp(source).webp({ quality: 86, effort: 6, alphaQuality: 100 }).toFile(target);
  originalBytes += (await stat(source)).size;
  optimizedBytes += (await stat(target)).size;
}
console.log(`Converted ${files.length} images: ${(originalBytes / 1024 / 1024).toFixed(1)} MB → ${(optimizedBytes / 1024 / 1024).toFixed(1)} MB`);
