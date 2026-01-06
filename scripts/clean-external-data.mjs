import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INPUT_FILE = path.join(ROOT, 'n8n_external_converted.jsonl');
const OUTPUT_FILE = path.join(ROOT, 'n8n_external_cleaned.jsonl');

async function main() {
    console.log('Cleaning external dataset (Streaming)...');
    
    const fileStream = fsSync.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const outputStream = fsSync.createWriteStream(OUTPUT_FILE);
    
    let count = 0;
    let failed = 0;

    for await (const line of rl) {
        try {
            const raw = JSON.parse(line);
            const instruction = raw.key;
            const workflow = JSON.parse(raw.value);

            if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
                failed++;
                continue;
            }

            const integrations = new Set();
            const credentials = new Set();
            workflow.nodes.forEach(node => {
                if (node.type && node.type.startsWith('n8n-nodes-base.')) {
                    integrations.add(node.type.replace('n8n-nodes-base.', ''));
                }
                if (node.credentials) {
                    Object.keys(node.credentials).forEach(c => credentials.add(c));
                }
            });

            const cleaned = {
                id: workflow.id || crypto.randomBytes(8).toString('hex'),
                name: workflow.name || instruction.substring(0, 100),
                node_count: workflow.nodes.length,
                integrations: Array.from(integrations).sort(),
                credentials: Array.from(credentials).sort(),
                content: workflow,
                meta: {
                    source: 'external_community',
                    instruction: instruction
                }
            };

            outputStream.write(JSON.stringify(cleaned) + '\n');
            count++;
            if (count % 5000 === 0) console.log(`Processed ${count}...`);
        } catch (e) {
            failed++;
        }
    }

    outputStream.end();
    console.log(`Successfully cleaned ${count} workflows. Failed/Skipped: ${failed}`);
}

main().catch(console.error);