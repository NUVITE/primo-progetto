import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#0284c7"/>
  <path d="M120 300 L392 150 L330 420 L280 330 L200 360 Z" fill="#ffffff" opacity="0.95"/>
  <path d="M120 300 L280 330 L392 150 Z" fill="#e0f2fe"/>
</svg>
`;

const outDir = path.join(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });

const sizes = [192, 512];
for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
  console.log(`generated icon-${size}.png`);
}

// Icona "maskable" con margine di sicurezza (safe zone) per Android
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0284c7"/>
  <g transform="translate(76,76) scale(0.7)">
    <path d="M120 300 L392 150 L330 420 L280 330 L200 360 Z" fill="#ffffff" opacity="0.95"/>
    <path d="M120 300 L280 330 L392 150 Z" fill="#e0f2fe"/>
  </g>
</svg>
`;
await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(path.join(outDir, "icon-maskable-512.png"));
console.log("generated icon-maskable-512.png");
