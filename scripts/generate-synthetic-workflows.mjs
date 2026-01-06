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
