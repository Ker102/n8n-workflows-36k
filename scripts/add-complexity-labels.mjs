/**
 * Add complexity labels to all workflows based on node count
 * Matches existing labels: basic (1-6), intermediate (7-15), advanced (16+)
 * 
 * Usage: node scripts/add-complexity-labels.mjs
 */

import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WORKFLOWS_DIR = path.join(ROOT, 'workflows');

// Complexity thresholds (matching existing labels)
function getComplexity(nodeCount) {
    if (nodeCount <= 6) return 'basic';
    if (nodeCount <= 15) return 'intermediate';
    return 'advanced';
}

async function walkDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await walkDir(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
            files.push(fullPath);
        }
    }
    return files;
}

async function main() {
    console.log('Adding complexity labels to workflows...\n');

    const stats = {
        processed: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        byComplexity: { basic: 0, intermediate: 0, advanced: 0 }
    };

    const allFiles = await walkDir(WORKFLOWS_DIR);
    console.log(`Found ${allFiles.length} workflow files\n`);

    for (const filePath of allFiles) {
        stats.processed++;

        try {
            const content = await fs.readFile(filePath, 'utf8');
            const workflow = JSON.parse(content);

            // Count nodes
            const nodes = workflow.nodes || [];
            const nodeCount = nodes.length;
            const complexity = getComplexity(nodeCount);

            stats.byComplexity[complexity]++;

            // Check if already has correct complexity
            if (workflow.meta?.complexity === complexity) {
                stats.skipped++;
                continue;
            }

            // Update workflow with complexity metadata
            if (!workflow.meta) workflow.meta = {};
            workflow.meta.complexity = complexity;
            workflow.meta.nodeCount = nodeCount;

            // Write back
            await fs.writeFile(filePath, JSON.stringify(workflow, null, 2));
            stats.updated++;

            if (stats.processed % 5000 === 0) {
                console.log(`Processed ${stats.processed}/${allFiles.length}...`);
            }

        } catch (e) {
            stats.errors++;
            if (stats.errors <= 5) {
                console.error(`Error: ${filePath} - ${e.message}`);
            }
        }
    }

    console.log('\n=== COMPLEXITY LABELS COMPLETE ===');
    console.log(`Processed: ${stats.processed}`);
    console.log(`Updated:   ${stats.updated}`);
    console.log(`Skipped:   ${stats.skipped} (already labeled)`);
    console.log(`Errors:    ${stats.errors}`);
    console.log('\nDistribution:');
    console.log(`  Basic:        ${stats.byComplexity.basic}`);
    console.log(`  Intermediate: ${stats.byComplexity.intermediate}`);
    console.log(`  Advanced:     ${stats.byComplexity.advanced}`);

    console.log('\nNext: Regenerate manifest with updated metadata');
}

main().catch(console.error);
