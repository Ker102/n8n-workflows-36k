#!/usr/bin/env python3
"""
Ingest n8n workflow embeddings into Qdrant Cloud.

Reads embeddings from embeddings_current.jsonl and uploads them to Qdrant Cloud.
Uses batch uploading for efficiency.

Usage:
    python scripts/ingest-to-qdrant.py [--verify-only] [--batch-size 100]
"""

import os
import json
import argparse
from pathlib import Path
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    CollectionInfo,
)

# Load environment
load_dotenv(Path(__file__).parent.parent / ".env.qdrant")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "n8n_workflows")

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
EMBEDDINGS_FILE = PROJECT_ROOT / "embeddings_current.jsonl"
PROJECT05_WORKFLOWS = PROJECT_ROOT.parent / "Project05" / "data" / "workflows" / "episodes"


def get_client() -> QdrantClient:
    """Create Qdrant client with cloud credentials."""
    if not QDRANT_URL or not QDRANT_API_KEY:
        raise ValueError("QDRANT_URL and QDRANT_API_KEY must be set in .env.qdrant")
    
    return QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY,
        timeout=60,
    )


def ensure_collection(client: QdrantClient, vector_size: int = 768):
    """Create collection if it doesn't exist."""
    collections = client.get_collections().collections
    exists = any(c.name == QDRANT_COLLECTION for c in collections)
    
    if exists:
        print(f"Collection '{QDRANT_COLLECTION}' already exists.")
        info = client.get_collection(QDRANT_COLLECTION)
        print(f"  Vectors: {info.points_count}")
        return info
    
    client.create_collection(
        collection_name=QDRANT_COLLECTION,
        vectors_config=VectorParams(
            size=vector_size,
            distance=Distance.COSINE,
        ),
    )
    print(f"Created collection '{QDRANT_COLLECTION}' (dim={vector_size}, distance=cosine)")
    return client.get_collection(QDRANT_COLLECTION)


def load_embeddings(file_path: Path):
    """Load embeddings from JSONL file."""
    embeddings = []
    with open(file_path, "r") as f:
        for line in f:
            if line.strip():
                embeddings.append(json.loads(line))
    return embeddings


def ingest_embeddings(client: QdrantClient, embeddings: list, batch_size: int = 100):
    """Upload embeddings to Qdrant in batches."""
    total = len(embeddings)
    uploaded = 0
    
    for i in range(0, total, batch_size):
        batch = embeddings[i:i + batch_size]
        points = []
        
        for idx, emb in enumerate(batch):
            point_id = i + idx
            points.append(
                PointStruct(
                    id=point_id,
                    vector=emb["embedding"],
                    payload={
                        "file_id": emb.get("file_id", ""),
                        "workflow_name": emb.get("workflow_name", ""),
                        "category": emb.get("category", ""),
                        "file_path": emb.get("file_path", ""),
                        "source": "project06",
                    },
                )
            )
        
        client.upsert(collection_name=QDRANT_COLLECTION, points=points)
        uploaded += len(points)
        
        if uploaded % 1000 == 0 or uploaded == total:
            print(f"  Uploaded {uploaded}/{total} vectors ({100*uploaded/total:.1f}%)")
    
    return uploaded


def verify_collection(client: QdrantClient):
    """Print collection stats."""
    try:
        info = client.get_collection(QDRANT_COLLECTION)
        print(f"\n=== Collection: {QDRANT_COLLECTION} ===")
        print(f"Vectors: {info.points_count}")
        print(f"Status: {info.status}")
        print(f"Config: {info.config.params.vectors}")
        
        # Test search
        if info.points_count > 0:
            # Get a random point to use as query
            points = client.scroll(QDRANT_COLLECTION, limit=1)[0]
            if points:
                result = client.search(
                    collection_name=QDRANT_COLLECTION,
                    query_vector=points[0].vector,
                    limit=3,
                )
                print(f"\nSample search (top 3 similar to first vector):")
                for r in result:
                    print(f"  - {r.payload.get('workflow_name', 'unnamed')} (score: {r.score:.3f})")
        
        return True
    except Exception as e:
        print(f"Error verifying collection: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Ingest embeddings to Qdrant Cloud")
    parser.add_argument("--verify-only", action="store_true", help="Only verify collection, don't ingest")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size for uploads")
    parser.add_argument("--recreate", action="store_true", help="Delete and recreate collection")
    args = parser.parse_args()
    
    print(f"Connecting to Qdrant Cloud...")
    print(f"  URL: {QDRANT_URL}")
    print(f"  Collection: {QDRANT_COLLECTION}")
    
    client = get_client()
    
    # Test connection
    try:
        collections = client.get_collections()
        print(f"  Connected! Found {len(collections.collections)} collection(s)")
    except Exception as e:
        print(f"Failed to connect: {e}")
        return 1
    
    if args.verify_only:
        verify_collection(client)
        return 0
    
    # Recreate collection if requested
    if args.recreate:
        try:
            client.delete_collection(QDRANT_COLLECTION)
            print(f"Deleted existing collection '{QDRANT_COLLECTION}'")
        except Exception:
            pass
    
    # Ensure collection exists
    ensure_collection(client, vector_size=768)
    
    # Load and ingest embeddings
    if EMBEDDINGS_FILE.exists():
        print(f"\nLoading embeddings from {EMBEDDINGS_FILE.name}...")
        embeddings = load_embeddings(EMBEDDINGS_FILE)
        print(f"  Loaded {len(embeddings)} embeddings")
        
        print(f"\nIngesting to Qdrant (batch_size={args.batch_size})...")
        count = ingest_embeddings(client, embeddings, batch_size=args.batch_size)
        print(f"  Done! Uploaded {count} vectors")
    else:
        print(f"Warning: Embeddings file not found: {EMBEDDINGS_FILE}")
    
    # Verify
    print("\nVerifying...")
    verify_collection(client)
    
    return 0


if __name__ == "__main__":
    exit(main())
