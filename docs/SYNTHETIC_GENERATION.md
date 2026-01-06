# Synthetic Workflow Generation: The Combinatorial Archetype Engine

## Overview

We are generating a large-scale, high-quality dataset of n8n workflows to train AI models. Instead of relying on random generation (which often produces invalid or broken JSON), we use a **Combinatorial Archetype Engine**.

This engine uses mathematically proven valid combinations of compatible nodes to generate thousands of unique, functional workflow scripts.

## How It Works

### 1. Equivalency Groups ("The Lego Blocks")

We define groups of nodes that are functionally interchangeable. If a workflow works with **Postgres**, it will likely work with **MySQL** or **Supabase** if the parameters are adjusted slightly.

**Examples of Groups:**
*   **Database:** `Postgres`, `MySQL`, `MariaDB`, `Supabase`, `MSSQL`, `MongoDB`, `Redis`, `DynamoDB`, `Firestore`.
*   **Messaging:** `Slack`, `Discord`, `Telegram`, `Microsoft Teams`, `Mattermost`, `Matrix`, `RocketChat`.
*   **AI:** `OpenAI`, `Anthropic`, `Google Gemini`, `Ollama`, `Mistral`, `HuggingFace`.
*   **E-commerce:** `Shopify`, `WooCommerce`, `Stripe`.
*   **DevOps:** `GitHub`, `GitLab`, `Bitbucket`.
*   **Social Media:** `X (Twitter)`, `LinkedIn`, `Facebook`, `WordPress`, `Medium`.
*   **Project Management:** `Trello`, `Asana`, `ClickUp`, `Notion`, `Monday.com`.
*   **Marketing:** `Mailchimp`, `ActiveCampaign`, `HubSpot`, `Mautic`.
*   **Forms:** `Typeform`, `Google Forms`, `JotForm`, `Tally`, `Webhook`.

### 2. Archetypes ("The Blueprints")

An Archetype is a tested, verified "Skeleton" of a workflow. It defines the structure but leaves the specific nodes as variables.

**Supported Archetypes:**
1.  **Form to Database & Notify:** Syncs form entries to SQL/NoSQL databases and alerts a team.
2.  **Scheduled Reports:** Fetches data weekly/daily and emails it via Gmail/Outlook/SMTP.
3.  **AI Summarizer:** Watches a spreadsheet, summarizes rows with AI, and posts to chat.
4.  **DevOps Notifier:** Monitors code repositories and alerts on specific events with AI context.
5.  **E-commerce Sync:** Syncs orders from Shopify/WooCommerce to databases.
6.  **Support Triage:** Classifies incoming tickets (Bug/Feature) using AI and routes them to Jira/Linear.
7.  **RAG Ingestion:** Watches Drive/Dropbox, splits documents, embeds them, and stores them in Vector DBs.
8.  **Social Media Blast:** Rewrites content from a feed/schedule using AI and posts to Social platforms.
9.  **PM Task Sync:** Syncs DevOps issues (GitHub/GitLab) to PM tools (Trello/Asana).
10. **Lead Capture:** Captures leads from forms, adds to Marketing platforms (Mailchimp/HubSpot), and notifies via Chat.
11. **File Analysis & Logging:** Analyzes new files from cloud storage (Drive/Dropbox/Box) using AI and logs metadata to any SQL/NoSQL database.

### 3. The Combinatorial Engine & Multipliers

The script iterates through every valid combination of the Equivalency Groups for each Archetype.

**The "Operation" Multiplier:**
For workflows involving databases, the engine automatically generates variants for different operations:
*   `Insert`
*   `Update`
*   `Upsert`

This significantly multiplies the output volume while maintaining validity.

**Calculation Example for "Form to Database":**
*   5 Forms * 9 Databases * 7 Messaging Apps = 315 Base Combinations.
*   Multiplier (3 Operations) = **945 Unique Workflows** from just one archetype!

## Usage

To generate the dataset:

```bash
node scripts/generate-synthetic-workflows.mjs
```

The files will be output to `workflows/synthetic_generated/`.

## Community Data Integration

In addition to synthetic generation, we have integrated and cleaned the **0xarchit/n8n_workflows_templates_dataset** from Hugging Face.

*   **Raw Source:** 49,320 workflows.
*   **Cleaning Process:** Stringified JSON values were parsed into valid objects, and metadata (node counts, integrations) was extracted to match our project schema.
*   **Result:** ~49,000 high-quality community examples added to the final pool.

## Final Dataset Statistics

*   **Total Unique Workflows:** 36,405
*   **Source Breakdown:**
    *   **Repository & Synthetic:** ~12,500 unique functional scripts.
    *   **Community (Cleaned):** ~23,900 unique community-contributed templates.
*   **Format:** JSON Lines (.jsonl)
*   **Quality:** Deduplicated by ID/Name and structurally verified.