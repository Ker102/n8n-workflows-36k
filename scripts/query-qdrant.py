#!/usr/bin/env python3
"""
Query the n8n workflow vector database.

Search for similar workflows by description.

Usage:
    python scripts/query-qdrant.py "Create a workflow that syncs Notion to Google Sheets"
    python scripts/query-qdrant.py --top 5 "Slack notification automation"
"""

import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv
import requests
from qdrant_client import QdrantClient
from qdrant_client.models import SearchRequest

# Load environment
load_dotenv(Path(__file__).parent.parent / ".env.qdrant")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "n8n_workflows")
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")

# Together AI embedding model (same as used for project06 embeddings)
TOGETHER_EMBED_MODEL = "togethercomputer/m2-bert-80M-8k-retrieval"


def get_qdrant_client() -> QdrantClient:
    """Create Qdrant client."""
    return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=60)


def generate_embedding(text: str) -> list:
    """Generate embedding using Together AI."""
    if not TOGETHER_API_KEY:
        raise ValueError("TOGETHER_API_KEY not set. Add it to .env.qdrant or export it.")
    
    response = requests.post(
        "https://api.together.xyz/v1/embeddings",
        headers={
            "Authorization": f"Bearer {TOGETHER_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": TOGETHER_EMBED_MODEL,
            "input": text,
        },
    )
    
    if response.status_code != 200:
        raise Exception(f"Together API error: {response.status_code} - {response.text}")
    
    data = response.json()
    return data["data"][0]["embedding"]


def search_workflows(query: str, top_k: int = 5):
    """Search for similar workflows."""
    print(f"Generating embedding for query: '{query}'")
    query_vector = generate_embedding(query)
    
    print(f"Searching in collection '{QDRANT_COLLECTION}'...")
    client = get_qdrant_client()
    
    # Use query method instead of deprecated search
    results = client.query_points(
        collection_name=QDRANT_COLLECTION,
        query=query_vector,
        limit=top_k,
        with_payload=True,
    )
    
    return results.points


def main():
    parser = argparse.ArgumentParser(description="Search n8n workflow database")
    parser.add_argument("query", type=str, help="Search query describing the workflow you want")
    parser.add_argument("--top", type=int, default=5, help="Number of results to return")
    args = parser.parse_args()
    
    try:
        results = search_workflows(args.query, args.top)
        
        print(f"\n=== Top {len(results)} Results ===\n")
        for i, r in enumerate(results, 1):
            payload = r.payload
            print(f"{i}. {payload.get('workflow_name', 'Unnamed')} (score: {r.score:.3f})")
            print(f"   Category: {payload.get('category', 'unknown')}")
            print(f"   Source: {payload.get('source', 'project06')}")
            print(f"   File: {payload.get('file_id', 'unknown')}")
            print()
            
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
