---
dataset_info:
  features:
  - name: workflow_id
    dtype: string
  - name: workflow_name
    dtype: string
  - name: node_count
    dtype: string
  - name: integrations
    dtype: string
  - name: category
    dtype: string
  - name: workflow_json
    dtype: string
  splits:
  - name: train
    num_bytes: 303685422
    num_examples: 36405
  download_size: 50034765
  dataset_size: 303685422
configs:
- config_name: default
  data_files:
  - split: train
    path: data/train-*
license: apache-2.0
task_categories:
- text-generation
- feature-extraction
language:
- en
tags:
- n8n
- automation
- workflow
- low-code
- agents
- mcp
size_categories:
- 10K<n<100K
---

# n8n Automation Atlas: 36,405 n8n Workflows

A curated collection of **36,405 unique n8n automation workflows**, organized and cleaned for AI training, research, and community use. This dataset combines high-quality synthetic workflows generated via a custom archetype engine with a massive pool of cleaned community templates.

## 🚀 Project Links

- **Main Repository:** [GitHub - Ker102/n8n-workflows-36k](https://github.com/Ker102/n8n-workflows-36k)
- **Author:** [Ker102 on GitHub](https://github.com/Ker102)
- **Explorer UI:** A Vue-based web application is included in the main repository to browse these workflows locally.

## 📊 Dataset Statistics

- **Total Unique Workflows:** 36,405
- **Source Breakdown:**
    - **Repository & Synthetic:** ~12,500 unique functional scripts.
    - **Community (Cleaned):** ~23,900 unique community-contributed templates.
- **Format:** JSON / JSON Lines (.jsonl)
- **License:** Apache 2.0

## 🧠 Methodology: The Combinatorial Archetype Engine

The majority of the synthetic workflows in this dataset were generated using a **Combinatorial Archetype Engine**. This engine ensures high validity and diversity by using mathematically proven combinations of compatible nodes.

### How it works:
- **Equivalency Groups:** Nodes are grouped by function (e.g., Databases, Messaging, AI, DevOps).
- **Archetypes:** Verified "skeletons" of common automation patterns (e.g., "Form to Database & Notify", "AI Summarizer", "RAG Ingestion").
- **Combinatorial Expansion:** The engine iterates through every valid combination of nodes for each archetype, multiplying the output volume while maintaining structural integrity.

## 🛠️ Data Quality & Cleaning

The community portion of this dataset (sourced from the `n8n_workflows_templates_dataset`) underwent an intensive cleaning process:
- **JSON Normalization:** Stringified JSON values were parsed into valid nested objects.
- **Structural Verification:** Every workflow was checked for the presence of `nodes` and `connections`.
- **Deduplication:** Workflows were deduplicated based on unique structural fingerprints and IDs.
- **Metadata Extraction:** Node counts and integration types were extracted to allow for easy filtering.

## 📂 Directory Structure (in GitHub)

- `workflows/`: Contains the raw JSON files for each workflow.
- `web/`: A Vue + Vite application serving as a "Workflow Explorer" UI.
- `scripts/`: Tools for manifest generation, synthetic creation, and data cleaning.

## 🤝 Community & Support

This project is maintained by **Ker102**. If you find this dataset useful, please consider:
- Giving the [GitHub repository](https://github.com/Ker102/n8n-workflows-36k) a ⭐.
- Following [Ker102 on GitHub](https://github.com/Ker102) for more automation and AI-related projects.
- Contributing new archetypes or reporting issues in the GitHub repository.

---

*Note: These workflows are provided as-is for research and development purposes. Always review workflows before importing them into a production n8n environment.*