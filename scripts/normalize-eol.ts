/**
 * Script to normalize line endings to LF for all text files in the project.
 * Run with: bun run scripts/normalize-eol.ts
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, extname } from 'path';

// Extensions to process
const TEXT_EXTENSIONS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.json', '.html', '.css', '.scss', '.less',
    '.md', '.txt', '.yml', '.yaml', '.xml', '.svg',
    '.gitignore', '.gitattributes', '.editorconfig',
    '.eslintrc', '.prettierrc', '.babelrc'
]);

// Directories to skip
const SKIP_DIRS = new Set([
    'node_modules', '.git', 'dist', '.next', 'build', 'coverage'
]);

async function normalizeFile(filePath: string): Promise<boolean> {
    try {
        const content = await readFile(filePath, 'utf-8');

        // Check if file has CRLF
        if (content.includes('\r\n')) {
            const normalized = content.replace(/\r\n/g, '\n');
            await writeFile(filePath, normalized, 'utf-8');
            return true;
        }
        return false;
    } catch (error) {
        console.error(`  ❌ Error processing ${filePath}:`, error);
        return false;
    }
}

async function processDirectory(dirPath: string): Promise<{ processed: number; converted: number }> {
    let processed = 0;
    let converted = 0;

    try {
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dirPath, entry.name);

            if (entry.isDirectory()) {
                if (!SKIP_DIRS.has(entry.name)) {
                    const result = await processDirectory(fullPath);
                    processed += result.processed;
                    converted += result.converted;
                }
            } else if (entry.isFile()) {
                const ext = extname(entry.name).toLowerCase();

                // Check if it's a text file we should process
                if (TEXT_EXTENSIONS.has(ext) || TEXT_EXTENSIONS.has(entry.name)) {
                    processed++;
                    if (await normalizeFile(fullPath)) {
                        console.log(`  ✓ Converted: ${fullPath}`);
                        converted++;
                    }
                }
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
    }

    return { processed, converted };
}

async function main() {
    console.log('🔄 Normalizing line endings to LF...\n');

    const startTime = Date.now();
    const projectRoot = process.cwd();

    const { processed, converted } = await processDirectory(projectRoot);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Done in ${duration}s`);
    console.log(`   📁 Files scanned: ${processed}`);
    console.log(`   🔧 Files converted: ${converted}`);

}

main().catch(console.error);
