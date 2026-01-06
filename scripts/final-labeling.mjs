import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INPUT_FILE = path.join(ROOT, 'n8n_workflows.jsonl');
const OUTPUT_FILE = path.join(ROOT, 'n8n_workflows_final.jsonl');

async function main() {
    console.log('Generating semantic search labels...');
    
    const fileStream = fsSync.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const outputStream = fsSync.createWriteStream(OUTPUT_FILE);
    
    let count = 0;

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const record = JSON.parse(line);
            
            // Construct semantic search text
            let parts = [];
            
            // 1. Name is always high value
            if (record.name) parts.push(`Name: ${record.name}`);
            
            // 2. Metadata description/instruction
            if (record.meta) {
                if (record.meta.description) parts.push(`Description: ${record.meta.description}`);
                if (record.meta.instruction) parts.push(`Instruction: ${record.meta.instruction}`);
                if (record.meta.archetype) parts.push(`Archetype: ${record.meta.archetype}`);
            }
            
            // 3. Category
            if (record.category) parts.push(`Category: ${record.category}`);
            
            // 4. Integrations (the actual tools used)
            if (record.integrations && record.integrations.length > 0) {
                parts.push(`Tools: ${record.integrations.join(', ')}`);
            }

            // Combine into a single string for embedding
            record.search_text = parts.join(' | ');

            outputStream.write(JSON.stringify(record) + '\n');
            count++;
            if (count % 5000 === 0) console.log(`Labeled ${count} workflows...`);
        } catch (e) {
            console.error('Error processing line', e);
        }
    }

    outputStream.end();
    console.log(`\nSUCCESS! Labeled ${count} workflows for semantic search.`);
    console.log(`Final Dataset: ${OUTPUT_FILE}`);
}

main().catch(console.error);
