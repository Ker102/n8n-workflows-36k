#!/usr/bin/env python3
"""
Convert cleaned training data to formats for different fine-tuning platforms.

Formats:
- Unsloth/HuggingFace: ChatML format with messages array
- Vertex AI (Gemini): Vertex AI tuning format
- OpenAI: OpenAI fine-tuning format

Usage:
    python scripts/convert-for-finetuning.py --format unsloth --input rag_dataset/training_data_clean.jsonl
"""

import json
import argparse
from pathlib import Path
import random


def convert_to_unsloth(examples: list, output_path: Path, split_ratio: float = 0.9):
    """Convert to Unsloth/HuggingFace ChatML format."""
    
    # Shuffle and split
    random.shuffle(examples)
    split_idx = int(len(examples) * split_ratio)
    train_examples = examples[:split_idx]
    val_examples = examples[split_idx:]
    
    def format_example(ex):
        return {
            "messages": [
                {"role": "system", "content": "You are an n8n workflow generation assistant. Given a description of what the workflow should do, generate a valid n8n workflow JSON."},
                {"role": "user", "content": ex["instruction"]},
                {"role": "assistant", "content": ex["output"]}
            ]
        }
    
    # Write train
    train_path = output_path.parent / f"{output_path.stem}_train.jsonl"
    with open(train_path, "w") as f:
        for ex in train_examples:
            f.write(json.dumps(format_example(ex)) + "\n")
    
    # Write validation
    val_path = output_path.parent / f"{output_path.stem}_val.jsonl"
    with open(val_path, "w") as f:
        for ex in val_examples:
            f.write(json.dumps(format_example(ex)) + "\n")
    
    print(f"Train: {len(train_examples)} examples -> {train_path}")
    print(f"Val: {len(val_examples)} examples -> {val_path}")
    
    return train_path, val_path


def convert_to_vertex(examples: list, output_path: Path, split_ratio: float = 0.9):
    """Convert to Vertex AI Gemini tuning format."""
    
    random.shuffle(examples)
    split_idx = int(len(examples) * split_ratio)
    train_examples = examples[:split_idx]
    val_examples = examples[split_idx:]
    
    def format_example(ex):
        return {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": ex["instruction"]}]
                },
                {
                    "role": "model", 
                    "parts": [{"text": ex["output"]}]
                }
            ]
        }
    
    # Write train
    train_path = output_path.parent / f"{output_path.stem}_vertex_train.jsonl"
    with open(train_path, "w") as f:
        for ex in train_examples:
            f.write(json.dumps(format_example(ex)) + "\n")
    
    # Write validation
    val_path = output_path.parent / f"{output_path.stem}_vertex_val.jsonl"
    with open(val_path, "w") as f:
        for ex in val_examples:
            f.write(json.dumps(format_example(ex)) + "\n")
    
    print(f"Train: {len(train_examples)} examples -> {train_path}")
    print(f"Val: {len(val_examples)} examples -> {val_path}")
    
    return train_path, val_path


def convert_to_openai(examples: list, output_path: Path, split_ratio: float = 0.9):
    """Convert to OpenAI fine-tuning format."""
    
    random.shuffle(examples)
    split_idx = int(len(examples) * split_ratio)
    train_examples = examples[:split_idx]
    val_examples = examples[split_idx:]
    
    def format_example(ex):
        return {
            "messages": [
                {"role": "system", "content": "You are an n8n workflow generation assistant. Generate valid n8n workflow JSON from descriptions."},
                {"role": "user", "content": ex["instruction"]},
                {"role": "assistant", "content": ex["output"]}
            ]
        }
    
    # Write train
    train_path = output_path.parent / f"{output_path.stem}_openai_train.jsonl"
    with open(train_path, "w") as f:
        for ex in train_examples:
            f.write(json.dumps(format_example(ex)) + "\n")
    
    # Write validation  
    val_path = output_path.parent / f"{output_path.stem}_openai_val.jsonl"
    with open(val_path, "w") as f:
        for ex in val_examples:
            f.write(json.dumps(format_example(ex)) + "\n")
    
    print(f"Train: {len(train_examples)} examples -> {train_path}")
    print(f"Val: {len(val_examples)} examples -> {val_path}")
    
    return train_path, val_path


def main():
    parser = argparse.ArgumentParser(description="Convert data for fine-tuning")
    parser.add_argument("--format", type=str, required=True, 
                        choices=["unsloth", "vertex", "openai", "all"],
                        help="Target format")
    parser.add_argument("--input", type=str, default="rag_dataset/training_data_clean.jsonl",
                        help="Input JSONL file")
    parser.add_argument("--output", type=str, default="rag_dataset/finetune",
                        help="Output base path")
    parser.add_argument("--max-examples", type=int, default=None,
                        help="Limit number of examples (for testing)")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for shuffling")
    args = parser.parse_args()
    
    random.seed(args.seed)
    
    input_path = Path(args.input)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Load examples
    print(f"Loading from {input_path}...")
    examples = []
    with open(input_path, "r") as f:
        for line in f:
            if line.strip():
                examples.append(json.loads(line))
    
    if args.max_examples:
        examples = examples[:args.max_examples]
    
    print(f"Loaded {len(examples)} examples")
    
    # Convert
    if args.format == "unsloth" or args.format == "all":
        print("\n=== Unsloth/HuggingFace Format ===")
        convert_to_unsloth(examples, output_path)
    
    if args.format == "vertex" or args.format == "all":
        print("\n=== Vertex AI Format ===")
        convert_to_vertex(examples, output_path)
    
    if args.format == "openai" or args.format == "all":
        print("\n=== OpenAI Format ===")
        convert_to_openai(examples, output_path)
    
    print("\nDone!")
    return 0


if __name__ == "__main__":
    exit(main())
