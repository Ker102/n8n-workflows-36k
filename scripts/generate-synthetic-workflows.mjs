import { promises as fs } from 'fs';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'workflows/synthetic_generated.jsonl');

// ==========================================
// 1. VERIFIED NODE GROUPS
// ==========================================
const TRIGGERS = {
    form: ['typeformTrigger', 'googleFormsTrigger', 'jotFormTrigger', 'surveyMonkeyTrigger'],
    devops: ['githubTrigger', 'gitlabTrigger', 'bitbucketTrigger', 'netlifyTrigger'],
    ecommerce: ['shopifyTrigger', 'woocommerceTrigger', 'stripeTrigger', 'gumroadTrigger'],
    drive: ['googleDriveTrigger', 'dropboxTrigger', 'boxTrigger'],
    mail: ['gmailTrigger', 'microsoftOutlookTrigger', 'mailchimpTrigger'],
    chat: ['telegramTrigger', 'slackTrigger', 'whatsAppTrigger'],
    calendar: ['googleCalendarTrigger', 'calendlyTrigger'],
    app: ['airtableTrigger', 'notionTrigger', 'clickUpTrigger', 'hubspotTrigger', 'jiraTrigger', 'pipedriveTrigger']
};

const ACTIONS = {
    database: ['postgres', 'mySql', 'supabase', 'mariaDb', 'snowflake', 'clickhouse', 'mongoDb', 'redis', 'dynamoDb'],
    spreadsheet: ['googleSheets', 'airtable', 'nocoDb', 'baserow'],
    messaging: ['slack', 'discord', 'telegram', 'mattermost', 'microsoftTeams'],
    mail: ['gmail', 'emailSend', 'microsoftOutlook', 'mailgun', 'sendGrid'],
    ai_model: ['@n8n/n8n-nodes-langchain.lmChatOpenAi', '@n8n/n8n-nodes-langchain.lmChatAnthropic', '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', '@n8n/n8n-nodes-langchain.lmChatOllama'],
    pm: ['trello', 'asana', 'clickUp', 'notion', 'mondayCom'],
    crm: ['hubspot', 'pipedrive', 'salesforce']
};

// Helper: All triggers and all databases
const ALL_TRIGGERS = Object.values(TRIGGERS).flat();
const ALL_DBS = [...ACTIONS.database, ...ACTIONS.spreadsheet];

// ==========================================
// 2. ARCHETYPES (Logic Blueprints)
// ==========================================
const ARCHETYPES = [
    {
        id: 'super_ai_pipeline',
        name: 'AI-Enhanced Data Pipeline',
        description: 'Trigger -> AI Analysis -> Database Storage -> Multi-Channel Notification',
        generate: function* () {
            for (const t of ALL_TRIGGERS) {
                for (const ai of ACTIONS.ai_model) {
                    for (const db of ALL_DBS) {
                        for (const msg of ACTIONS.messaging) {
                            yield {
                                nodes: [
                                    { name: 'Trigger', type: `n8n-nodes-base.${t}`, position: [0, 0] },
                                    { name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent', position: [200, 0], parameters: { prompt: 'Process this input' } },
                                    { name: 'AI Model', type: ai, position: [200, 200] },
                                    { name: 'Database', type: `n8n-nodes-base.${db}`, position: [400, 0], parameters: { operation: 'insert' } },
                                    { name: 'Notify', type: `n8n-nodes-base.${msg}`, position: [600, 0] }
                                ],
                                connections: {
                                    'Trigger': { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] },
                                    'AI Model': { ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]] },
                                    'AI Agent': { main: [[{ node: 'Database', type: 'main', index: 0 }]] },
                                    'Database': { main: [[{ node: 'Notify', type: 'main', index: 0 }]] }
                                }
                            };
                        }
                    }
                }
            }
        }
    },
    {
        id: 'cross_pm_sync',
        name: 'Cross-Platform Task Sync',
        description: 'Syncs tasks between two different project management tools.',
        generate: function* () {
            for (const src of ACTIONS.pm) {
                for (const dest of ACTIONS.pm) {
                    if (src === dest) continue;
                    yield {
                        nodes: [
                            { name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger', position: [0, 0] },
                            { name: 'Source', type: `n8n-nodes-base.${src}`, position: [200, 0], parameters: { operation: 'getAll' } },
                            { name: 'Destination', type: `n8n-nodes-base.${dest}`, position: [400, 0], parameters: { operation: 'create' } }
                        ],
                        connections: {
                            'Schedule': { main: [[{ node: 'Source', type: 'main', index: 0 }]] },
                            'Source': { main: [[{ node: 'Destination', type: 'main', index: 0 }]] }
                        }
                    };
                }
            }
        }
    },
    {
        id: 'multi_dest_backup',
        name: 'Redundant Data Backup',
        description: 'Trigger -> Store in SQL -> Store in NoSQL (Redundant)',
        generate: function* () {
            for (const t of ALL_TRIGGERS) {
                for (const db1 of ACTIONS.database) {
                    for (const db2 of ACTIONS.spreadsheet) {
                        yield {
                            nodes: [
                                { name: 'Trigger', type: `n8n-nodes-base.${t}`, position: [0, 0] },
                                { name: 'Primary DB', type: `n8n-nodes-base.${db1}`, position: [200, 0], parameters: { operation: 'insert' } },
                                { name: 'Secondary DB', type: `n8n-nodes-base.${db2}`, position: [400, 0], parameters: { operation: 'append' } }
                            ],
                            connections: {
                                'Trigger': { main: [[{ node: 'Primary DB', type: 'main', index: 0 }]] },
                                'Primary DB': { main: [[{ node: 'Secondary DB', type: 'main', index: 0 }]] }
                            }
                        };
                    }
                }
            }
        }
    },
    {
        id: 'support_triage',
        name: 'Customer Support Triage',
        description: 'Form -> AI Analysis -> Support Ticket -> Team Notification',
        generate: function* () {
            for (const f of TRIGGERS.form) {
                for (const ai of ACTIONS.ai_model) {
                    for (const msg of ACTIONS.messaging) {
                        yield {
                            nodes: [
                                { name: 'Form', type: `n8n-nodes-base.${f}`, position: [0, 0] },
                                { name: 'AI Analyzer', type: '@n8n/n8n-nodes-langchain.agent', position: [200, 0] },
                                { name: 'AI Model', type: ai, position: [200, 200] },
                                { name: 'Ticket', type: 'n8n-nodes-base.jira', position: [400, 0], parameters: { operation: 'create' } },
                                { name: 'Notify', type: `n8n-nodes-base.${msg}`, position: [600, 0] }
                            ],
                            connections: {
                                'Form': { main: [[{ node: 'AI Analyzer', type: 'main', index: 0 }]] },
                                'AI Model': { ai_languageModel: [[{ node: 'AI Analyzer', type: 'ai_languageModel', index: 0 }]] },
                                'AI Analyzer': { main: [[{ node: 'Ticket', type: 'main', index: 0 }]] },
                                'Ticket': { main: [[{ node: 'Notify', type: 'main', index: 0 }]] }
                            }
                        };
                    }
                }
            }
        }
    },
    {
        id: 'ecommerce_flow',
        name: 'E-commerce Order Pipeline',
        description: 'Store Trigger -> CRM Update -> Email Receipt -> Shipping Label (Mock)',
        generate: function* () {
            for (const s of TRIGGERS.ecommerce) {
                for (const crm of ACTIONS.crm) {
                    for (const email of ACTIONS.mail) {
                        yield {
                            nodes: [
                                { name: 'Order', type: `n8n-nodes-base.${s}`, position: [0, 0] },
                                { name: 'CRM', type: `n8n-nodes-base.${crm}`, position: [200, 0], parameters: { operation: 'upsert' } },
                                { name: 'Email', type: `n8n-nodes-base.${email}`, position: [400, 0] }
                            ],
                            connections: {
                                'Order': { main: [[{ node: 'CRM', type: 'main', index: 0 }]] },
                                'CRM': { main: [[{ node: 'Email', type: 'main', index: 0 }]] }
                            }
                        };
                    }
                }
            }
        }
    },
    // ==========================================
    // ARCHETYPE 6: Scheduled Reports
    // ==========================================
    {
        id: 'scheduled_reports',
        name: 'Scheduled Reports',
        description: 'Schedule -> Fetch Data -> Email Report via Gmail/Outlook/SMTP',
        generate: function* () {
            for (const db of ALL_DBS) {
                for (const email of ACTIONS.mail) {
                    yield {
                        nodes: [
                            { name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger', position: [0, 0], parameters: { rule: { interval: [{ field: 'weeks', weeksInterval: 1 }] } } },
                            { name: 'Fetch Data', type: `n8n-nodes-base.${db}`, position: [200, 0], parameters: { operation: 'getAll' } },
                            { name: 'Send Report', type: `n8n-nodes-base.${email}`, position: [400, 0] }
                        ],
                        connections: {
                            'Schedule': { main: [[{ node: 'Fetch Data', type: 'main', index: 0 }]] },
                            'Fetch Data': { main: [[{ node: 'Send Report', type: 'main', index: 0 }]] }
                        }
                    };
                }
            }
        }
    },
    // ==========================================
    // ARCHETYPE 7: AI Summarizer
    // ==========================================
    {
        id: 'ai_summarizer',
        name: 'AI Summarizer',
        description: 'Watches a spreadsheet, summarizes rows with AI, and posts to chat',
        generate: function* () {
            for (const sheet of ACTIONS.spreadsheet) {
                for (const ai of ACTIONS.ai_model) {
                    for (const msg of ACTIONS.messaging) {
                        yield {
                            nodes: [
                                { name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger', position: [0, 0] },
                                { name: 'Get Rows', type: `n8n-nodes-base.${sheet}`, position: [200, 0], parameters: { operation: 'getAll' } },
                                { name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent', position: [400, 0], parameters: { prompt: 'Summarize the following data' } },
                                { name: 'AI Model', type: ai, position: [400, 200] },
                                { name: 'Post Summary', type: `n8n-nodes-base.${msg}`, position: [600, 0] }
                            ],
                            connections: {
                                'Schedule': { main: [[{ node: 'Get Rows', type: 'main', index: 0 }]] },
                                'Get Rows': { main: [[{ node: 'AI Agent', type: 'main', index: 0 }]] },
                                'AI Model': { ai_languageModel: [[{ node: 'AI Agent', type: 'ai_languageModel', index: 0 }]] },
                                'AI Agent': { main: [[{ node: 'Post Summary', type: 'main', index: 0 }]] }
                            }
                        };
                    }
                }
            }
        }
    },
    // ==========================================
    // ARCHETYPE 8: DevOps Notifier
    // ==========================================
    {
        id: 'devops_notifier',
        name: 'DevOps Notifier',
        description: 'Monitors code repositories and alerts on specific events with AI context',
        generate: function* () {
            for (const devops of TRIGGERS.devops) {
                for (const ai of ACTIONS.ai_model) {
                    for (const msg of ACTIONS.messaging) {
                        yield {
                            nodes: [
                                { name: 'Repo Event', type: `n8n-nodes-base.${devops}`, position: [0, 0] },
                                { name: 'AI Context', type: '@n8n/n8n-nodes-langchain.agent', position: [200, 0], parameters: { prompt: 'Analyze this repository event and provide context' } },
                                { name: 'AI Model', type: ai, position: [200, 200] },
                                { name: 'Alert Team', type: `n8n-nodes-base.${msg}`, position: [400, 0] }
                            ],
                            connections: {
                                'Repo Event': { main: [[{ node: 'AI Context', type: 'main', index: 0 }]] },
                                'AI Model': { ai_languageModel: [[{ node: 'AI Context', type: 'ai_languageModel', index: 0 }]] },
                                'AI Context': { main: [[{ node: 'Alert Team', type: 'main', index: 0 }]] }
                            }
                        };
                    }
                }
            }
        }
    },
    // ==========================================
    // ARCHETYPE 9: RAG Ingestion
    // ==========================================
    {
        id: 'rag_ingestion',
        name: 'RAG Ingestion Pipeline',
        description: 'Watches Drive/Dropbox, splits documents, embeds them, and stores in Vector DBs',
        generate: function* () {
            const vectorDbs = ['pinecone', 'qdrant', 'supabaseVectorStore'];
            for (const drive of TRIGGERS.drive) {
                for (const ai of ACTIONS.ai_model) {
                    for (const vectorDb of vectorDbs) {
                        yield {
                            nodes: [
                                { name: 'File Added', type: `n8n-nodes-base.${drive}`, position: [0, 0] },
                                { name: 'Extract Text', type: 'n8n-nodes-base.extractFromFile', position: [200, 0] },
                                { name: 'Split Text', type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', position: [400, 0] },
                                { name: 'Embeddings', type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', position: [400, 200] },
                                { name: 'Vector Store', type: `@n8n/n8n-nodes-langchain.vectorStore${vectorDb.charAt(0).toUpperCase() + vectorDb.slice(1)}`, position: [600, 0] }
                            ],
                            connections: {
                                'File Added': { main: [[{ node: 'Extract Text', type: 'main', index: 0 }]] },
                                'Extract Text': { main: [[{ node: 'Split Text', type: 'main', index: 0 }]] },
                                'Split Text': { main: [[{ node: 'Vector Store', type: 'main', index: 0 }]] },
                                'Embeddings': { ai_embedding: [[{ node: 'Vector Store', type: 'ai_embedding', index: 0 }]] }
                            }
                        };
                    }
                }
            }
        }
    },
    // ==========================================
    // ARCHETYPE 10: Social Media Blast
    // ==========================================
    {
        id: 'social_media_blast',
        name: 'Social Media Blast',
        description: 'Rewrites content from a feed/schedule using AI and posts to Social platforms',
        generate: function* () {
            const socialPlatforms = ['twitter', 'linkedIn', 'facebook'];
            for (const ai of ACTIONS.ai_model) {
                for (const social of socialPlatforms) {
                    yield {
                        nodes: [
                            { name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger', position: [0, 0] },
                            { name: 'Get Content', type: 'n8n-nodes-base.rssFeedRead', position: [200, 0] },
                            { name: 'AI Rewriter', type: '@n8n/n8n-nodes-langchain.agent', position: [400, 0], parameters: { prompt: 'Rewrite this content for social media engagement' } },
                            { name: 'AI Model', type: ai, position: [400, 200] },
                            { name: 'Post', type: `n8n-nodes-base.${social}`, position: [600, 0], parameters: { operation: 'create' } }
                        ],
                        connections: {
                            'Schedule': { main: [[{ node: 'Get Content', type: 'main', index: 0 }]] },
                            'Get Content': { main: [[{ node: 'AI Rewriter', type: 'main', index: 0 }]] },
                            'AI Model': { ai_languageModel: [[{ node: 'AI Rewriter', type: 'ai_languageModel', index: 0 }]] },
                            'AI Rewriter': { main: [[{ node: 'Post', type: 'main', index: 0 }]] }
                        }
                    };
                }
            }
        }
    },
    // ==========================================
    // ARCHETYPE 11: Lead Capture
    // ==========================================
    {
        id: 'lead_capture',
        name: 'Lead Capture Pipeline',
        description: 'Captures leads from forms, adds to Marketing platforms, and notifies via Chat',
        generate: function* () {
            const marketing = ['mailchimp', 'hubspot', 'activeCampaign'];
            for (const form of TRIGGERS.form) {
                for (const mkt of marketing) {
                    for (const msg of ACTIONS.messaging) {
                        yield {
                            nodes: [
                                { name: 'Form Submit', type: `n8n-nodes-base.${form}`, position: [0, 0] },
                                { name: 'Add to List', type: `n8n-nodes-base.${mkt}`, position: [200, 0], parameters: { operation: 'subscribe' } },
                                { name: 'Notify Sales', type: `n8n-nodes-base.${msg}`, position: [400, 0] }
                            ],
                            connections: {
                                'Form Submit': { main: [[{ node: 'Add to List', type: 'main', index: 0 }]] },
                                'Add to List': { main: [[{ node: 'Notify Sales', type: 'main', index: 0 }]] }
                            }
                        };
                    }
                }
            }
        }
    }
];

// ==========================================
// 3. STREAMING GENERATOR
// ==========================================
async function main() {
    console.log('Starting Massive Synthetic Streaming (Target: 20k+)...');
    const outputStream = fsSync.createWriteStream(OUTPUT_FILE);

    let count = 0;

    for (const archetype of ARCHETYPES) {
        console.log(`Generating variations for: ${archetype.name}...`);
        const generator = archetype.generate();

        for (const wf of generator) {
            const record = {
                id: crypto.randomBytes(8).toString('hex'),
                name: `${archetype.name} (Variant ${count})`,
                node_count: wf.nodes.length,
                integrations: wf.nodes.map(n => n.type.replace('n8n-nodes-base.', '')).filter(t => !t.includes('Trigger')),
                content: {
                    nodes: wf.nodes,
                    connections: wf.connections
                },
                meta: {
                    generated: true,
                    archetype: archetype.id
                }
            };

            outputStream.write(JSON.stringify(record) + '\n');
            count++;

            if (count % 5000 === 0) console.log(`Generated ${count} workflows...`);
            if (count >= 30000) break; // Safety cap
        }
    }

    outputStream.end();
    console.log(`\nSUCCESS! Generated ${count} unique synthetic workflows.`);
    console.log(`Output: ${OUTPUT_FILE}`);
}

main().catch(console.error);
