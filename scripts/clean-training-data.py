#!/usr/bin/env python3
"""
Clean the fine-tuning dataset for n8n workflow generation.

Issues to fix:
1. Workflow names don't match actual node types (e.g., "Telegram" workflow uses Slack nodes)
2. Too many similar variants of the same base workflow
3. Output JSON is bloated with unnecessary metadata
4. Some examples may have broken JSON

Usage:
    python scripts/clean-training-data.py --input rag_dataset/training_data.jsonl --output rag_dataset/training_data_clean.jsonl
"""

import json
import argparse
import hashlib
from pathlib import Path
from collections import defaultdict
import re


def get_workflow_signature(workflow: dict) -> str:
    """Create a signature for deduplication based on node types and structure."""
    nodes = workflow.get("nodes", [])
    node_types = sorted([n.get("type", "") for n in nodes])
    connections = workflow.get("connections", {})
    conn_count = len(connections)
    return f"{'-'.join(node_types)}:{conn_count}"


def get_primary_trigger(nodes: list) -> str:
    """Extract the primary trigger type from workflow nodes."""
    for node in nodes:
        node_type = node.get("type", "")
        if "Trigger" in node_type or "trigger" in node_type:
            # Extract the base trigger type (e.g., 'slack' from 'n8n-nodes-base.slackTrigger')
            base = node_type.split(".")[-1].replace("Trigger", "").lower()
            return base
    return "unknown"


def get_node_types_list(nodes: list) -> list:
    """Get list of node type basenames."""
    types = []
    for node in nodes:
        node_type = node.get("type", "").split(".")[-1]
        if node_type and node_type not in types:
            types.append(node_type)
    return types


def fix_workflow_name(original_name: str, primary_trigger: str, nodes: list) -> str:
    """Fix misleading workflow names based on actual nodes used."""
    # Remove version suffix like _v660
    name = re.sub(r'_v\d+$', '', original_name)
    
    # Get actual messaging platform from trigger
    platform_map = {
        'telegram': 'Telegram',
        'slack': 'Slack', 
        'discord': 'Discord',
        'whatsapp': 'WhatsApp',
        'microsoft': 'Teams',
    }
    
    # Check if name mentions a platform that doesn't match the trigger
    for key, platform in platform_map.items():
        if platform.lower() in name.lower() and key != primary_trigger:
            # Replace the platform name with the actual one
            if primary_trigger in platform_map:
                actual_platform = platform_map[primary_trigger]
                name = re.sub(rf'\b{platform}\b', actual_platform, name, flags=re.IGNORECASE)
    
    return name


def clean_workflow_output(workflow: dict) -> dict:
    """Remove unnecessary metadata from workflow to reduce output size."""
    cleaned = {
        "name": workflow.get("name", ""),
        "nodes": [],
        "connections": workflow.get("connections", {}),
    }
    
    # Keep only essential node properties
    for node in workflow.get("nodes", []):
        cleaned_node = {
            "id": node.get("id", ""),
            "name": node.get("name", ""),
            "type": node.get("type", ""),
            "position": node.get("position", [0, 0]),
            "parameters": node.get("parameters", {}),
        }
        # Only include credentials if present
        if node.get("credentials"):
            cleaned_node["credentials"] = node["credentials"]
        if node.get("typeVersion"):
            cleaned_node["typeVersion"] = node["typeVersion"]
        cleaned["nodes"].append(cleaned_node)
    
    # Optionally keep description
    if workflow.get("description"):
        cleaned["description"] = workflow["description"]
    
    return cleaned


def rebuild_instruction(workflow_name: str, category: str, node_types: list) -> str:
    """Rebuild instruction to be clear and consistent."""
    types_str = ", ".join(node_types[:8])  # Limit to first 8 types
    if len(node_types) > 8:
        types_str += f" (+{len(node_types) - 8} more)"
    
    return f"Create an n8n workflow for: {workflow_name} (Category: {category}) using {types_str}"


def process_dataset(input_path: Path, output_path: Path, max_variants: int = 3, 
                    dedupe: bool = True, fix_names: bool = True, clean_output: bool = True):
    """Process and clean the training dataset."""
    
    print(f"Reading from: {input_path}")
    
    stats = {
        "total_read": 0,
        "json_errors": 0,
        "duplicates_removed": 0,
        "names_fixed": 0,
        "total_written": 0,
    }
    
    # First pass: collect all examples and group by signature
    examples_by_signature = defaultdict(list)
    
    with open(input_path, "r") as f:
        for line_num, line in enumerate(f, 1):
            if not line.strip():
                continue
            
            stats["total_read"] += 1
            
            try:
                data = json.loads(line)
            except json.JSONDecodeError as e:
                stats["json_errors"] += 1
                print(f"  JSON error at line {line_num}: {e}")
                continue
            
            # Parse the output workflow
            output_str = data.get("output", "{}")
            try:
                workflow = json.loads(output_str)
            except json.JSONDecodeError:
                stats["json_errors"] += 1
                continue
            
            # Get node types and signature
            nodes = workflow.get("nodes", [])
            if not nodes:
                continue
            
            signature = get_workflow_signature(workflow)
            primary_trigger = get_primary_trigger(nodes)
            node_types = get_node_types_list(nodes)
            
            example = {
                "original": data,
                "workflow": workflow,
                "signature": signature,
                "primary_trigger": primary_trigger,
                "node_types": node_types,
                "category": data.get("category", "General"),
                "score": data.get("score", 0),
            }
            
            examples_by_signature[signature].append(example)
            
            if stats["total_read"] % 10000 == 0:
                print(f"  Read {stats['total_read']} examples...")
    
    print(f"Found {len(examples_by_signature)} unique workflow signatures")
    
    # Second pass: deduplicate and clean
    cleaned_examples = []
    
    for signature, examples in examples_by_signature.items():
        # Sort by score (higher is better)
        examples.sort(key=lambda x: x["score"], reverse=True)
        
        # Keep only top N variants
        if dedupe:
            kept = examples[:max_variants]
            stats["duplicates_removed"] += len(examples) - len(kept)
        else:
            kept = examples
        
        for ex in kept:
            workflow = ex["workflow"]
            original = ex["original"]
            
            # Fix workflow name if needed
            original_name = workflow.get("name", "Unnamed")
            if fix_names:
                fixed_name = fix_workflow_name(original_name, ex["primary_trigger"], workflow.get("nodes", []))
                if fixed_name != original_name:
                    stats["names_fixed"] += 1
                    workflow["name"] = fixed_name
            else:
                fixed_name = original_name
            
            # Clean output
            if clean_output:
                workflow = clean_workflow_output(workflow)
            
            # Rebuild instruction
            instruction = rebuild_instruction(fixed_name, ex["category"], ex["node_types"])
            
            cleaned_example = {
                "instruction": instruction,
                "output": json.dumps(workflow, separators=(',', ':')),  # Compact JSON
                "category": ex["category"],
                "score": ex["score"],
            }
            
            cleaned_examples.append(cleaned_example)
    
    # Write output
    print(f"Writing {len(cleaned_examples)} cleaned examples to {output_path}")
    
    with open(output_path, "w") as f:
        for ex in cleaned_examples:
            f.write(json.dumps(ex) + "\n")
            stats["total_written"] += 1
    
    return stats


def main():
    parser = argparse.ArgumentParser(description="Clean n8n workflow training data")
    parser.add_argument("--input", type=str, default="rag_dataset/training_data.jsonl",
                        help="Input JSONL file")
    parser.add_argument("--output", type=str, default="rag_dataset/training_data_clean.jsonl",
                        help="Output JSONL file")
    parser.add_argument("--max-variants", type=int, default=3,
                        help="Max variants per unique workflow structure")
    parser.add_argument("--no-dedupe", action="store_true",
                        help="Skip deduplication")
    parser.add_argument("--no-fix-names", action="store_true",
                        help="Skip fixing workflow names")
    parser.add_argument("--no-clean-output", action="store_true",
                        help="Skip cleaning output JSON")
    args = parser.parse_args()
    
    input_path = Path(args.input)
    output_path = Path(args.output)
    
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        return 1
    
    print("=== Cleaning Training Data ===\n")
    
    stats = process_dataset(
        input_path=input_path,
        output_path=output_path,
        max_variants=args.max_variants,
        dedupe=not args.no_dedupe,
        fix_names=not args.no_fix_names,
        clean_output=not args.no_clean_output,
    )
    
    print("\n=== Statistics ===")
    print(f"Total read: {stats['total_read']}")
    print(f"JSON errors skipped: {stats['json_errors']}")
    print(f"Duplicates removed: {stats['duplicates_removed']}")
    print(f"Names fixed: {stats['names_fixed']}")
    print(f"Total written: {stats['total_written']}")
    
    # Calculate size reduction
    input_size = input_path.stat().st_size / (1024 * 1024)
    output_size = output_path.stat().st_size / (1024 * 1024)
    print(f"\nSize: {input_size:.1f} MB -> {output_size:.1f} MB ({100 * (1 - output_size/input_size):.1f}% reduction)")
    
    return 0


if __name__ == "__main__":
    exit(main())
