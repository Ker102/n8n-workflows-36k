#!/usr/bin/env python3
"""
Ingest high-quality n8n workflows from Project05 to Qdrant using Gemini embeddings.

Usage:
    python scripts/ingest-project05-gemini.py

Requires:
    - GOOGLE_API_KEY in environment (Gemini API)
    - QDRANT_* vars from .env.qdrant
"""

import os
import json
import time
from pathlib import Path
from dotenv import load_dotenv
import requests
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

# Load environment
load_dotenv(Path(__file__).parent.parent / ".env.qdrant")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "n8n_workflows")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
PROJECT05_WORKFLOWS = PROJECT_ROOT.parent / "Project05" / "data" / "workflows" / "episodes"

# Gemini embedding model (768 dimensions - matches project06)
GEMINI_EMBED_MODEL = "text-embedding-004"


def get_qdrant_client() -> QdrantClient:
    """Create Qdrant client."""
    return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)


def get_current_max_id(client: QdrantClient) -> int:
    """Get the current maximum point ID in the collection."""
    try:
        info = client.get_collection(QDRANT_COLLECTION)
        return info.points_count
    except Exception:
        return 0


def workflow_to_text(workflow_data: dict, filename: str) -> str:
    """Convert workflow JSON to text for embedding."""
    nodes = workflow_data.get("nodes", [])
    node_types = [n.get("type", "").split(".")[-1] for n in nodes]
    node_names = [n.get("name", "") for n in nodes]
    
    # Build a descriptive text
    lines = [
        f"Workflow: {filename}",
        f"Nodes: {', '.join(node_names[:10])}",
        f"Node types: {', '.join(set(node_types))}",
        f"Total nodes: {len(nodes)}",
    ]
    
    connections = workflow_data.get("connections", {})
    if connections:
        lines.append(f"Connections: {len(connections)} source nodes")
    
    return "\n".join(lines)


def generate_embedding_gemini(text: str) -> list:
    """Generate embedding using Gemini API."""
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY not set")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_EMBED_MODEL}:embedContent?key={GOOGLE_API_KEY}"
    
    response = requests.post(
        url,
        headers={"Content-Type": "application/json"},
        json={
            "model": f"models/{GEMINI_EMBED_MODEL}",
            "content": {"parts": [{"text": text}]},
        },
    )
    
    if response.status_code != 200:
        raise Exception(f"Gemini API error: {response.status_code} - {response.text}")
    
    data = response.json()
    return data["embedding"]["values"]


def load_project05_workflows() -> list:
    """Load all workflow JSON files from project05."""
    workflows = []
    
    if not PROJECT05_WORKFLOWS.exists():
        print(f"Directory not found: {PROJECT05_WORKFLOWS}")
        return workflows
    
    for file_path in sorted(PROJECT05_WORKFLOWS.glob("*.json")):
        try:
            with open(file_path, "r") as f:
                data = json.load(f)
            
            if "nodes" not in data:
                continue
                
            workflows.append({
                "file_path": str(file_path),
                "file_id": file_path.stem,
                "workflow_name": file_path.stem.replace("_", " ").title(),
                "data": data,
            })
        except Exception as e:
            print(f"  Skipping {file_path.name}: {e}")
    
    return workflows


def main():
    print("=== Ingesting Project05 Workflows (Gemini) ===\n")
    
    # Load workflows
    print(f"Loading workflows from: {PROJECT05_WORKFLOWS}")
    workflows = load_project05_workflows()
    print(f"  Found {len(workflows)} workflows\n")
    
    if not workflows:
        print("No workflows to ingest.")
        return 1
    
    if not GOOGLE_API_KEY:
        print("ERROR: GOOGLE_API_KEY or GEMINI_API_KEY not set")
        return 1
    
    # Connect to Qdrant
    print("Connecting to Qdrant Cloud...")
    client = get_qdrant_client()
    start_id = get_current_max_id(client)
    print(f"  Current vectors: {start_id}")
    print(f"  New vectors start at ID: {start_id}\n")
    
    # Process workflows
    print("Generating embeddings and uploading...")
    points = []
    
    for i, wf in enumerate(workflows):
        try:
            text = workflow_to_text(wf["data"], wf["workflow_name"])
            embedding = generate_embedding_gemini(text)
            
            point_id = start_id + i
            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "file_id": wf["file_id"],
                        "workflow_name": wf["workflow_name"],
                        "category": "project05_episodes",
                        "file_path": wf["file_path"],
                        "source": "project05",
                        "node_count": len(wf["data"].get("nodes", [])),
                    },
                )
            )
            
            print(f"  [{i+1}/{len(workflows)}] {wf['workflow_name']}")
            time.sleep(0.2)  # Rate limit
            
        except Exception as e:
            print(f"  [{i+1}/{len(workflows)}] ERROR: {wf['workflow_name']} - {e}")
    
    if points:
        print(f"\nUploading {len(points)} vectors to Qdrant...")
        client.upsert(collection_name=QDRANT_COLLECTION, points=points)
        print("  Done!")
    
    info = client.get_collection(QDRANT_COLLECTION)
    print(f"\n=== Collection Stats ===")
    print(f"Total vectors: {info.points_count}")
    
    return 0


if __name__ == "__main__":
    exit(main())
