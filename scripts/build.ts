import { $ } from "bun";
import { mkdir, cp, rm, readdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import sharp from "sharp";

const ROOT = import.meta.dir.replace("/scripts", "").replace("\\scripts", "");
const DIST = join(ROOT, "dist");
const SRC = join(ROOT, "src");
const ICONS = join(ROOT, "icons");

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

    // Build system logs page
    await Bun.build({
        entrypoints: [join(SRC, "system-logs/system-logs.ts")],
        outdir: DIST,
        target: "browser",
        naming: "system-logs.js",
    });

    // Build whoami page
    await Bun.build({
        entrypoints: [join(SRC, "whoami/whoami.ts")],
        outdir: DIST,
        target: "browser",
        naming: "whoami.js",
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
    await cp(join(SRC, "system-logs/system-logs.html"), join(DIST, "system-logs.html"));
    await cp(join(SRC, "system-logs/system-logs.css"), join(DIST, "system-logs.css"));
    await cp(join(SRC, "whoami/whoami.html"), join(DIST, "whoami.html"));
    await cp(join(SRC, "whoami/whoami.css"), join(DIST, "whoami.css"));

    // Copy icons folder (recursively to include toolbar subdirectory)
    const iconsDir = join(ROOT, "icons");
    const distIconsDir = join(DIST, "icons");

    if (existsSync(iconsDir)) {
        await cp(iconsDir, distIconsDir, { recursive: true });
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
    console.log("🎨 Converting SVG icons to PNG...");

    const iconSvgPath = join(ICONS, "icon.svg");
    const distIconsDir = join(DIST, "icons");

    // Ensure icons directory exists
    if (!existsSync(distIconsDir)) {
        await mkdir(distIconsDir, { recursive: true });
    }

    // Read the main SVG icon
    const svgBuffer = await readFile(iconSvgPath);

    // Generate PNG icons at different sizes
    const sizes = [16, 32, 48, 128];

    for (const size of sizes) {
        try {
            const pngBuffer = await sharp(svgBuffer)
                .resize(size, size)
                .png()
                .toBuffer();

            await writeFile(join(distIconsDir, `icon-${size}.png`), pngBuffer);
            console.log(`   ✓ Generated icon-${size}.png`);
        } catch (error) {
            console.error(`   ✗ Failed to generate icon-${size}.png:`, error);
        }
    }
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
