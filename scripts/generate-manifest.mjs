import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WORKFLOWS_DIR = path.join(ROOT, 'workflows');
const OUTPUT_FILE = path.join(ROOT, 'web/public/workflows.json');

const COLLECTION_META = {
  'community-mega-pack': {
    label: 'Community Mega Pack',
    description: 'General-purpose automations covering marketing, ops, CRM, enrichment, and more.'
  },
  'ai-automation-lab': {
    label: 'AI Automation Lab',
    description: 'AI-first agents, copilots, enrichment flows, and RAG building blocks.'
  },
  'pinecone-rag-kits': {
    label: 'Pinecone RAG Kits',
    description: 'Retrieval-augmented generation starters powered by Pinecone indexes.'
  },
  'box-mcp-demos': {
    label: 'Box MCP Demos',
    description: 'Sample Box MCP workflows for DocGen, metadata, and insurance use cases.'
  },
  'synapse-pro-ops': {
    label: 'Synapse Pro Ops',
    description: 'Production-grade automations shared by ProfSynapse.'
  },
  'self-hosted-ai-starter': {
    label: 'Self-Hosted AI Starter',
    description: 'n8n self-hosted AI starter kit demo workflows.'
  }
};

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
  const dirEntries = await fs.readdir(WORKFLOWS_DIR, { withFileTypes: true });
  const categories = [];
  let total = 0;

  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;
    const categoryId = entry.name;
    const meta = COLLECTION_META[categoryId] ?? {
      label: categoryId,
      description: 'Community-contributed workflows.'
    };

    const absoluteCategoryPath = path.join(WORKFLOWS_DIR, categoryId);
    const files = await walkDir(absoluteCategoryPath);
    const workflows = await Promise.all(files.map(async (filePath) => {
      const stats = await fs.stat(filePath);
      return {
        name: path.basename(filePath, '.json'),
        fileName: path.basename(filePath),
        relativePath: path.relative(ROOT, filePath).replace(/\\/g, '/'),
        categoryId,
        sizeBytes: stats.size
      };
    }));

    workflows.sort((a, b) => a.fileName.localeCompare(b.fileName));

    categories.push({
      id: categoryId,
      label: meta.label,
      description: meta.description,
      count: workflows.length,
      workflows
    });
    total += workflows.length;
  }

  categories.sort((a, b) => a.label.localeCompare(b.label));

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalWorkflows: total,
    categoryCount: categories.length,
    categories
  };

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
  console.log(`Manifest created at ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
