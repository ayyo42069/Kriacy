// Kriacy Build Script
// Run with: bun run scripts/build.ts

import { $ } from "bun";
import { mkdir, cp, rm, readdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const ROOT = import.meta.dir.replace("/scripts", "").replace("\\scripts", "");
const DIST = join(ROOT, "dist");
const SRC = join(ROOT, "src");

async function clean() {
    console.log("🧹 Cleaning dist folder...");
    if (existsSync(DIST)) {
        await rm(DIST, { recursive: true });
    }
    await mkdir(DIST);
}

async function buildTypeScript() {
    console.log("📦 Building TypeScript...");

    // Build service worker
    await Bun.build({
        entrypoints: [join(SRC, "background/service-worker.ts")],
        outdir: DIST,
        target: "browser",
        naming: "service-worker.js",
    });

    // Build content script (isolated world)
    await Bun.build({
        entrypoints: [join(SRC, "content/content-script.ts")],
        outdir: DIST,
        target: "browser",
        naming: "content-script.js",
    });

    // Build main world script
    await Bun.build({
        entrypoints: [join(SRC, "content/main-world.ts")],
        outdir: DIST,
        target: "browser",
        naming: "main-world.js",
    });

    // Build popup
    await Bun.build({
        entrypoints: [join(SRC, "popup/popup.ts")],
        outdir: DIST,
        target: "browser",
        naming: "popup.js",
    });

    // Build options
    await Bun.build({
        entrypoints: [join(SRC, "options/options.ts")],
        outdir: DIST,
        target: "browser",
        naming: "options.js",
    });

    // Build logs page
    await Bun.build({
        entrypoints: [join(SRC, "logs/logs.ts")],
        outdir: DIST,
        target: "browser",
        naming: "logs.js",
    });
}

async function copyStaticFiles() {
    console.log("📄 Copying static files...");

    // Copy manifest
    await cp(join(ROOT, "manifest.json"), join(DIST, "manifest.json"));

    // Copy HTML files
    await cp(join(SRC, "popup/popup.html"), join(DIST, "popup.html"));
    await cp(join(SRC, "popup/popup.css"), join(DIST, "popup.css"));
    await cp(join(SRC, "options/options.html"), join(DIST, "options.html"));
    await cp(join(SRC, "options/options.css"), join(DIST, "options.css"));
    await cp(join(SRC, "logs/logs.html"), join(DIST, "logs.html"));
    await cp(join(SRC, "logs/logs.css"), join(DIST, "logs.css"));

    // Copy icons folder
    const iconsDir = join(ROOT, "icons");
    const distIconsDir = join(DIST, "icons");
    await mkdir(distIconsDir);

    if (existsSync(iconsDir)) {
        const files = await readdir(iconsDir);
        for (const file of files) {
            await cp(join(iconsDir, file), join(distIconsDir, file));
        }
    }

    // Copy declarativeNetRequest rules
    const rulesDir = join(ROOT, "rules");
    const distRulesDir = join(DIST, "rules");
    await mkdir(distRulesDir);

    if (existsSync(rulesDir)) {
        const files = await readdir(rulesDir);
        for (const file of files) {
            await cp(join(rulesDir, file), join(distRulesDir, file));
        }
    }
}

async function generatePngIcons() {
    console.log("🎨 Generating PNG icons with cozy warm theme...");

    const sizes = [16, 32, 48, 128];

    for (const size of sizes) {
        const png = createCozyPng(size);
        await writeFile(join(DIST, "icons", `icon-${size}.png`), png);
    }
}

// Create a cozy warm-themed PNG icon
function createCozyPng(size: number): Buffer {
    const width = size;
    const height = size;
    const rawData: number[] = [];

    // Cozy warm color palette
    // Primary: #d4a574 (212, 165, 116)
    // Secondary: #c9956a (201, 149, 106)
    // Tertiary: #a67c52 (166, 124, 82)
    // Background: #f5e6d3 (245, 230, 211)

    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = size * 0.44;
    const innerRadius = size * 0.35;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

            // Gradient position (0 to 1)
            const t = (x + y) / (width + height);

            // Cozy warm gradient colors
            const r1 = 212, g1 = 165, b1 = 116; // #d4a574
            const r2 = 166, g2 = 124, b2 = 82;  // #a67c52

            // Circle background
            if (dist < outerRadius) {
                const r = Math.round(r1 + (r2 - r1) * t);
                const g = Math.round(g1 + (g2 - g1) * t);
                const b = Math.round(b1 + (b2 - b1) * t);

                // Check if we're in the "K" letter area
                const kArea = isInKLetter(x, y, size);

                if (kArea) {
                    // Cream/off-white for the K letter
                    rawData.push(245, 230, 211, 255);
                } else {
                    rawData.push(r, g, b, 255);
                }
            } else if (dist < outerRadius + 1.5) {
                // Anti-aliased edge
                const alpha = Math.round(255 * (1 - (dist - outerRadius) / 1.5));
                const r = Math.round(r1 + (r2 - r1) * t);
                const g = Math.round(g1 + (g2 - g1) * t);
                const b = Math.round(b1 + (b2 - b1) * t);
                rawData.push(r, g, b, alpha);
            } else {
                // Transparent
                rawData.push(0, 0, 0, 0);
            }
        }
    }

    return createMinimalPng(width, height, rawData);
}

// Check if a point is within the "K" letter shape
function isInKLetter(x: number, y: number, size: number): boolean {
    const cx = size / 2;
    const cy = size / 2;

    // Scale factors
    const s = size / 32;

    // K letter bounds (relative to center)
    const kLeft = cx - 6 * s;
    const kRight = cx + 9 * s;
    const kTop = cy - 8 * s;
    const kBottom = cy + 8 * s;

    // Vertical stroke of K
    if (x >= kLeft && x <= kLeft + 3 * s && y >= kTop && y <= kBottom) {
        return true;
    }

    // Upper diagonal of K
    const upperMidY = cy;
    if (y >= kTop && y <= upperMidY) {
        const diagProgress = (upperMidY - y) / (upperMidY - kTop);
        const diagLeft = kLeft + 3 * s;
        const diagRight = diagLeft + (kRight - diagLeft) * diagProgress;
        if (x >= diagLeft && x <= diagRight && x <= kRight) {
            // Make it a line, not a filled area
            const expectedX = diagLeft + (kRight - diagLeft) * diagProgress;
            if (Math.abs(x - expectedX) < 2.5 * s) {
                return true;
            }
        }
    }

    // Lower diagonal of K
    if (y > upperMidY && y <= kBottom) {
        const diagProgress = (y - upperMidY) / (kBottom - upperMidY);
        const diagLeft = kLeft + 3 * s;
        const expectedX = diagLeft + (kRight - diagLeft) * diagProgress;
        if (Math.abs(x - expectedX) < 2.5 * s) {
            return true;
        }
    }

    return false;
}

function createMinimalPng(width: number, height: number, pixels: number[]): Buffer {
    // PNG signature
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;  // bit depth
    ihdrData[9] = 6;  // color type (RGBA)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace

    const ihdrChunk = createChunk('IHDR', ihdrData);

    // IDAT chunk (image data)
    const rawImageData: number[] = [];
    for (let y = 0; y < height; y++) {
        rawImageData.push(0); // filter byte
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            rawImageData.push(pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]);
        }
    }

    const compressed = Bun.deflateSync(Buffer.from(rawImageData));
    const idatChunk = createChunk('IDAT', Buffer.from(compressed));

    // IEND chunk
    const iendChunk = createChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type: string, data: Buffer): Buffer {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type, 'ascii');
    const crcInput = Buffer.concat([typeBuffer, data]);
    const crc = crc32(crcInput);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc >>> 0, 0);

    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(data: Buffer): number {
    let crc = 0xffffffff;
    const table = getCrc32Table();

    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
    }

    return crc ^ 0xffffffff;
}

let crc32Table: number[] | null = null;
function getCrc32Table(): number[] {
    if (crc32Table) return crc32Table;

    crc32Table = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            if (c & 1) {
                c = 0xedb88320 ^ (c >>> 1);
            } else {
                c = c >>> 1;
            }
        }
        crc32Table[n] = c;
    }

    return crc32Table;
}

async function main() {
    console.log("🚀 Building Kriacy Extension...\n");

    try {
        await clean();
        await buildTypeScript();
        await copyStaticFiles();
        await generatePngIcons();

        console.log("\n✅ Build complete! Extension is in the 'dist' folder.");
        console.log("\n📝 To load in Chrome:");
        console.log("   1. Go to chrome://extensions");
        console.log("   2. Enable Developer Mode");
        console.log("   3. Click 'Load unpacked'");
        console.log("   4. Select the 'dist' folder");
    } catch (error) {
        console.error("❌ Build failed:", error);
        process.exit(1);
    }
}

main();
